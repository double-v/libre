// @vitest-environment node
/**
 * #198 — dépôt de la clé d'identité au coffre.
 *
 * Cette route décide de ce qui devient la clé d'un compte. Deux refus y valent
 * autant que le succès : ne jamais accepter une privée qui n'ouvre pas la
 * publique annoncée, et ne jamais écraser une clé déjà enregistrée. Les deux
 * dégâts seraient irréversibles et invisibles jusqu'au prochain changement
 * d'appareil.
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
  userKey: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn(), create: vi.fn() },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

vi.mock('@/lib/rate-limit', () => ({
  __esModule: true,
  rateLimit: vi.fn(async () => ({ success: true })),
  limits: { api: { limit: 100, windowMs: 60000 } },
}));

const { POST } = await import('@/app/api/users/keys/route');
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
  new NextRequest('http://x/api/users/keys', {
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
});

describe('POST /api/users/keys — dépôt au coffre', () => {
  it('scelle la clé privée quand elle accompagne la publique', async () => {
    const { publicKey, privateKey } = await paire();

    const res = await POST(requete({ publicKey, privateKey }));
    expect(res.status).toBe(200);

    const ecrit = fakeDb.userKey.upsert.mock.calls[0][0];
    const blob = ecrit.create.encryptedPrivateKey;
    expect(blob).not.toContain(privateKey); // jamais en clair en base
    expect(unwrapPrivateKey(blob, MOI)).toBe(privateKey);
    expect(ecrit.create.escrowedAt).toBeInstanceOf(Date);
  });

  it('accepte encore une publique seule — le client génère avant de savoir sceller', async () => {
    const { publicKey } = await paire();
    expect((await POST(requete({ publicKey }))).status).toBe(200);
  });

  it("refuse une privée qui n'engendre pas la publique annoncée", async () => {
    const a = await paire();
    const b = await paire();

    const res = await POST(requete({ publicKey: a.publicKey, privateKey: b.privateKey }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'cle_non_appariee' });
    expect(fakeDb.userKey.upsert).not.toHaveBeenCalled();
  });

  it("refuse d'écraser une clé publique déjà enregistrée — c'est le geste qui détruit les historiques", async () => {
    const ancienne = await paire();
    const nouvelle = await paire();
    fakeDb.userKey.findUnique.mockResolvedValue({
      publicKey: ancienne.publicKey,
      encryptedPrivateKey: null,
    });

    const res = await POST(requete({ publicKey: nouvelle.publicKey }));
    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({ error: 'cle_deja_enregistree' });
    expect(fakeDb.userKey.upsert).not.toHaveBeenCalled();
  });

  it('accepte le versement de la clé locale correspondante — le chemin de la migration douce (#336)', async () => {
    const { publicKey, privateKey } = await paire();
    fakeDb.userKey.findUnique.mockResolvedValue({ publicKey, encryptedPrivateKey: null });

    const res = await POST(requete({ publicKey, privateKey }));
    expect(res.status).toBe(200);
    expect(fakeDb.userKey.upsert).toHaveBeenCalled();
  });

  it('rejette une clé publique qui n’est pas une clé ECDH P-256', async () => {
    expect((await POST(requete({ publicKey: 'nawak' }))).status).toBe(400);
  });

  it('refuse sans session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const { publicKey } = await paire();
    expect((await POST(requete({ publicKey }))).status).toBe(401);
  });

  it('refuse de sceller quand le coffre n’est pas configuré, au lieu de perdre la clé en silence', async () => {
    delete process.env.CHAT_ESCROW_KEY;
    const { publicKey, privateKey } = await paire();

    const res = await POST(requete({ publicKey, privateKey }));
    expect(res.status).toBe(503);
    expect(fakeDb.userKey.upsert).not.toHaveBeenCalled();
  });
});
