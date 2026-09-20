// @vitest-environment node
/**
 * #341 — l'état de la clé d'un compte, vu par le support.
 *
 * Trois garde-fous valent plus que le contenu : la réponse ne porte jamais la
 * clé (ni publique ni enveloppée), rien n'ouvre un message, et la
 * consultation laisse une trace dans le journal de modération.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({
  __esModule: true,
  default: vi.fn(),
  getServerSession: mockGetServerSession,
}));

const fakeDb = {
  user: { findUnique: vi.fn() },
  userKey: { findUnique: vi.fn() },
  userKeyHistory: { aggregate: vi.fn() },
  moderationLog: { create: vi.fn() },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const { GET } = await import('@/app/api/admin/users/[id]/cle/route');

const ADMIN = '11111111-1111-1111-1111-111111111111';
const CIBLE = '22222222-2222-2222-2222-222222222222';
const PUBLIQUE = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE_publique_factice';
const ENVELOPPE = 'v1.enveloppe.factice.jamais.exposee';

const lire = () =>
  GET(new NextRequest(`http://x/api/admin/users/${CIBLE}/cle`), { params: Promise.resolve({ id: CIBLE }) });

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: ADMIN, email: 'admin@x.fr' } });
  fakeDb.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
  fakeDb.userKeyHistory.aggregate.mockResolvedValue({ _count: { _all: 0 }, _max: { replacedAt: null } });
  fakeDb.moderationLog.create.mockResolvedValue({});
});

describe('GET /api/admin/users/[id]/cle', () => {
  it('diagnostique « perdue » : publique connue, coffre vide', async () => {
    fakeDb.userKey.findUnique.mockResolvedValue({
      publicKey: PUBLIQUE,
      keyCreatedAt: new Date('2026-06-01T00:00:00Z'),
      encryptedPrivateKey: null,
      escrowedAt: null,
    });
    const res = await lire();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ diagnostic: 'perdue', coffreGarni: false, reinitialisations: 0 });
    expect(body.keyCreatedAt).toBe('2026-06-01T00:00:00.000Z');
  });

  it('diagnostique « récupérable » quand le coffre est garni, avec les réinitialisations', async () => {
    fakeDb.userKey.findUnique.mockResolvedValue({
      publicKey: PUBLIQUE,
      keyCreatedAt: new Date('2026-09-20T10:00:00Z'),
      encryptedPrivateKey: ENVELOPPE,
      escrowedAt: new Date('2026-09-20T10:00:00Z'),
    });
    fakeDb.userKeyHistory.aggregate.mockResolvedValue({
      _count: { _all: 1 },
      _max: { replacedAt: new Date('2026-09-20T10:00:00Z') },
    });
    const body = await (await lire()).json();
    expect(body).toMatchObject({ diagnostic: 'recuperable', coffreGarni: true, reinitialisations: 1 });
    expect(body.derniereReinitialisation).toBe('2026-09-20T10:00:00.000Z');
  });

  it('diagnostique « aucune » sans ligne de clé', async () => {
    fakeDb.userKey.findUnique.mockResolvedValue(null);
    const body = await (await lire()).json();
    expect(body).toMatchObject({ diagnostic: 'aucune', coffreGarni: false, keyCreatedAt: null });
  });

  it('ne renvoie jamais la clé — ni publique, ni enveloppée (non-régression)', async () => {
    fakeDb.userKey.findUnique.mockResolvedValue({
      publicKey: PUBLIQUE,
      keyCreatedAt: new Date(),
      encryptedPrivateKey: ENVELOPPE,
      escrowedAt: new Date(),
    });
    const texte = JSON.stringify(await (await lire()).json());
    expect(texte).not.toContain(PUBLIQUE);
    expect(texte).not.toContain(ENVELOPPE);
    expect(texte).not.toMatch(/publicKey|encryptedPrivateKey|privateKey/);
  });

  it('journalise la consultation dans le journal de modération', async () => {
    fakeDb.userKey.findUnique.mockResolvedValue(null);
    await lire();
    expect(fakeDb.moderationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ adminId: ADMIN, targetUserId: CIBLE, action: 'VIEW_KEY_STATE' }),
    });
  });

  it('refuse un non-admin, sans rien journaliser', async () => {
    fakeDb.user.findUnique.mockResolvedValue({ role: 'USER' });
    expect((await lire()).status).toBe(404); // 404 : les routes admin ne se révèlent pas
    expect(fakeDb.moderationLog.create).not.toHaveBeenCalled();
  });
});
