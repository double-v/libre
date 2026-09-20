// @vitest-environment node
/**
 * #340 — réinitialiser sa clé de messagerie.
 *
 * C'est le seul chemin qui remplace une clé publique connue, et il n'existe
 * que parce qu'une personne l'a demandé en connaissance de cause. Deux choses
 * comptent autant que le succès : l'ancienne publique reste tracée (le pair
 * relit ce qu'il avait chiffré pour elle), et on ne remplace jamais sans
 * sceller la nouvelle privée — sinon on recrée exactement le défaut d'origine.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { generateKeyPair as genPaire } from 'node:crypto';
import { promisify } from 'node:util';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({
  __esModule: true,
  default: vi.fn(),
  getServerSession: mockGetServerSession,
}));

const fakeDb = {
  userKey: { findUnique: vi.fn(), upsert: vi.fn() },
  userKeyHistory: { create: vi.fn() },
  $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(fakeDb)),
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

vi.mock('@/lib/rate-limit', () => ({
  __esModule: true,
  rateLimit: vi.fn(async () => ({ success: true })),
  limits: { api: { limit: 100, windowMs: 60000 } },
}));

const { POST } = await import('@/app/api/users/keys/reset/route');
const { unwrapPrivateKey } = await import('@/lib/crypto-escrow');

const MOI = '11111111-1111-1111-1111-111111111111';

async function paire() {
  const { publicKey, privateKey } = await promisify(genPaire)('ec', {
    namedCurve: 'P-256',
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
  });
  return {
    publicKey: (publicKey as unknown as Buffer).toString('base64'),
    privateKey: (privateKey as unknown as Buffer).toString('base64'),
  };
}

const requete = (body: unknown) =>
  new NextRequest('http://x/api/users/keys/reset', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CHAT_ESCROW_KEY = Buffer.alloc(32, 1).toString('base64');
  mockGetServerSession.mockResolvedValue({ user: { id: MOI, email: 'moi@x.fr' } });
  fakeDb.userKey.findUnique.mockResolvedValue(null);
  fakeDb.userKey.upsert.mockResolvedValue({});
  fakeDb.userKeyHistory.create.mockResolvedValue({});
});

describe('POST /api/users/keys/reset — réinitialisation volontaire', () => {
  it('remplace la clé, scelle la nouvelle privée et archive l’ancienne publique', async () => {
    const ancienne = await paire();
    const nouvelle = await paire();
    const depuis = new Date('2026-06-01T00:00:00Z');
    fakeDb.userKey.findUnique.mockResolvedValue({
      publicKey: ancienne.publicKey,
      keyCreatedAt: depuis,
      encryptedPrivateKey: null,
    });

    const res = await POST(requete(nouvelle));
    expect(res.status).toBe(200);

    const archive = fakeDb.userKeyHistory.create.mock.calls[0][0].data;
    expect(archive).toMatchObject({ userId: MOI, publicKey: ancienne.publicKey, createdAt: depuis });

    const ecrit = fakeDb.userKey.upsert.mock.calls[0][0];
    expect(ecrit.update.publicKey).toBe(nouvelle.publicKey);
    expect(ecrit.update.keyCreatedAt).toBeInstanceOf(Date);
    expect(ecrit.update.encryptedPrivateKey).not.toContain(nouvelle.privateKey);
    expect(unwrapPrivateKey(ecrit.update.encryptedPrivateKey, MOI)).toBe(nouvelle.privateKey);
  });

  it('fonctionne aussi sans clé préalable — rien à archiver', async () => {
    const res = await POST(requete(await paire()));
    expect(res.status).toBe(200);
    expect(fakeDb.userKeyHistory.create).not.toHaveBeenCalled();
    expect(fakeDb.userKey.upsert).toHaveBeenCalled();
  });

  it('exige la clé privée : une réinitialisation non scellée recréerait le défaut d’origine', async () => {
    const { publicKey } = await paire();
    const res = await POST(requete({ publicKey }));
    expect(res.status).toBe(400);
    expect(fakeDb.userKey.upsert).not.toHaveBeenCalled();
  });

  it("refuse une privée qui n'engendre pas la publique annoncée", async () => {
    const a = await paire();
    const b = await paire();
    const res = await POST(requete({ publicKey: a.publicKey, privateKey: b.privateKey }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'cle_non_appariee' });
    expect(fakeDb.userKey.upsert).not.toHaveBeenCalled();
  });

  it('refuse quand le coffre n’est pas configuré, plutôt que de remplacer sans sceller', async () => {
    delete process.env.CHAT_ESCROW_KEY;
    const res = await POST(requete(await paire()));
    expect(res.status).toBe(503);
    expect(fakeDb.userKey.upsert).not.toHaveBeenCalled();
    expect(fakeDb.userKeyHistory.create).not.toHaveBeenCalled();
  });

  it('rejette une clé publique qui n’est pas une clé ECDH P-256', async () => {
    const { privateKey } = await paire();
    expect((await POST(requete({ publicKey: 'nawak', privateKey }))).status).toBe(400);
  });

  it('refuse sans session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    expect((await POST(requete(await paire()))).status).toBe(401);
  });
});
