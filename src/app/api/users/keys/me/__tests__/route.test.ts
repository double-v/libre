// @vitest-environment node
//
// La route importe `crypto-escrow`, qui refuse de se charger là où `window`
// existe (garde anti-client). Environnement node, donc.
/**
 * #198 — restitution de la clé d'identité depuis le coffre.
 *
 * C'est la route qui rend la messagerie portable : sans elle, changer d'appareil
 * perd l'historique. Elle manipule le secret le plus sensible du produit, d'où
 * l'insistance de ces tests sur ce qu'elle refuse de faire.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({
  __esModule: true,
  default: vi.fn(),
  getServerSession: mockGetServerSession,
}));

const fakeDb = { userKey: { findUnique: vi.fn() } };
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

vi.mock('@/lib/rate-limit', () => ({
  __esModule: true,
  rateLimit: vi.fn(async () => ({ success: true })),
  limits: { api: { limit: 100, windowMs: 60000 } },
}));

const { GET } = await import('@/app/api/users/keys/me/route');
const { wrapPrivateKey } = await import('@/lib/crypto-escrow');

const MOI = '11111111-1111-1111-1111-111111111111';
const AUTRE = '22222222-2222-2222-2222-222222222222';
const PUBLIQUE = Buffer.alloc(91, 3).toString('base64');
const PRIVEE = Buffer.alloc(138, 7).toString('base64');

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CHAT_ESCROW_KEY = Buffer.alloc(32, 1).toString('base64');
  mockGetServerSession.mockResolvedValue({ user: { id: MOI, email: 'moi@x.fr' } });
});

describe('GET /api/users/keys/me', () => {
  it('refuse sans session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });

  it('restitue la clé privée déscellée quand le coffre est garni', async () => {
    fakeDb.userKey.findUnique.mockResolvedValue({
      publicKey: PUBLIQUE,
      encryptedPrivateKey: wrapPrivateKey(PRIVEE, MOI),
    });

    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ publicKey: PUBLIQUE, privateKey: PRIVEE });
  });

  it("n'interroge que la clé du compte de la session — jamais celle d'un autre", async () => {
    fakeDb.userKey.findUnique.mockResolvedValue({
      publicKey: PUBLIQUE,
      encryptedPrivateKey: wrapPrivateKey(PRIVEE, MOI),
    });

    await GET();
    expect(fakeDb.userKey.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: MOI } }),
    );
  });

  it('interdit toute mise en cache de la réponse', async () => {
    fakeDb.userKey.findUnique.mockResolvedValue({
      publicKey: PUBLIQUE,
      encryptedPrivateKey: wrapPrivateKey(PRIVEE, MOI),
    });

    expect((await GET()).headers.get('Cache-Control')).toMatch(/no-store/);
  });

  it('distingue « clé publique connue, coffre vide » — c’est ce cas qui déclenche la migration douce (#336)', async () => {
    fakeDb.userKey.findUnique.mockResolvedValue({
      publicKey: PUBLIQUE,
      encryptedPrivateKey: null,
    });

    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ publicKey: PUBLIQUE, privateKey: null });
  });

  it('répond 404 quand le compte n’a aucune clé — c’est le seul cas où le client a le droit d’en générer une', async () => {
    fakeDb.userKey.findUnique.mockResolvedValue(null);
    expect((await GET()).status).toBe(404);
  });

  it('signale une enveloppe illisible au lieu de faire passer le compte pour neuf', async () => {
    // Enveloppe scellée pour un AUTRE compte : la garde par données associées
    // la refuse. Répondre « pas de clé » ici pousserait le client à en générer
    // une, donc à détruire l'historique — c'est exactement ce qu'on corrige.
    fakeDb.userKey.findUnique.mockResolvedValue({
      publicKey: PUBLIQUE,
      encryptedPrivateKey: wrapPrivateKey(PRIVEE, AUTRE),
    });

    const res = await GET();
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ error: 'escrow_illisible' });
  });

  it('dit franchement que le coffre n’est pas configuré plutôt que d’échouer sur un undefined', async () => {
    delete process.env.CHAT_ESCROW_KEY;
    fakeDb.userKey.findUnique.mockResolvedValue({
      publicKey: PUBLIQUE,
      encryptedPrivateKey: 'v1:xx:yy:zz',
    });

    const res = await GET();
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({ error: 'escrow_indisponible' });
  });
});
