// @vitest-environment node
/**
 * File « Profils à vérifier » (spec 006, #444) : les signaux deviennent des
 * décisions humaines journalisées. Aucune sanction automatique.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({ __esModule: true, default: vi.fn(), getServerSession: mockGetServerSession }));

const fakeDb = {
  user: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  profileReview: { upsert: vi.fn() },
  moderationLog: { create: vi.fn() },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

const { GET } = await import('../route');
const { PUT } = await import('../[userId]/route');

const ADMIN = '11111111-1111-1111-1111-111111111111';
const U1 = '22222222-2222-2222-2222-222222222222';
const U2 = '33333333-3333-3333-3333-333333333333';
const U3 = '44444444-4444-4444-4444-444444444444';

const sig = (type: string, force: string, jour: string) => ({ type, force, extrait: null, photoKey: null, autreUserId: null, createdAt: new Date(`2026-09-${jour}`) });
const compte = (id: string, signaux: unknown[], review: unknown = null) => ({
  id,
  displayName: `M-${id.slice(0, 2)}`,
  email: 'lola.privee@gmail.com',
  createdAt: new Date('2026-09-01'),
  isBanned: false,
  retraitAt: null,
  profile: { photos: ['photos/a.webp'], bio: 'Salut' },
  profileSignals: signaux,
  profileReview: review,
});

const decider = (userId: string, body: unknown) =>
  PUT(new NextRequest(`http://x/api/admin/profils-a-verifier/${userId}`, { method: 'PUT', body: JSON.stringify(body) }), { params: Promise.resolve({ userId }) });

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: ADMIN, email: 'a@x.fr' } });
  fakeDb.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
  fakeDb.user.update.mockResolvedValue({});
  fakeDb.profileReview.upsert.mockResolvedValue({});
  fakeDb.moderationLog.create.mockResolvedValue({});
});

describe('GET /api/admin/profils-a-verifier', () => {
  it('refuse un non-admin (404 : la route admin ne se révèle pas)', async () => {
    fakeDb.user.findUnique.mockResolvedValue({ role: 'USER' });
    expect((await GET()).status).toBe(404);
  });

  it('ne garde que les profils de la file, forts d’abord, e-mail masqué', async () => {
    fakeDb.user.findMany.mockResolvedValue([
      compte(U1, [sig('contact_bio', 'faible', '20')]), // un faible seul : hors file
      compte(U2, [sig('contact_bio', 'faible', '24'), sig('contact_pseudo', 'faible', '24')]), // deux faibles
      compte(U3, [sig('contact_photo', 'fort', '21')]), // un fort
    ]);
    const body = await (await GET()).json();
    expect(body.profils.map((p: { userId: string }) => p.userId)).toEqual([U3, U2]);
    expect(JSON.stringify(body)).not.toContain('lola.privee@gmail.com');
    expect(body.profils[0].email).toMatch(/\*\*\*/);
    expect(body.profils[0].photos[0]).toBe('/api/photos/photos%2Fa.webp');
  });

  it('âge mis en doute : en tête, devant plus d’indices forts (#437)', async () => {
    fakeDb.user.findMany.mockResolvedValue([
      compte(U1, [sig('contact_photo', 'fort', '21'), sig('photo_bannie', 'fort', '22')]),
      compte(U2, [sig('signalement_mineur', 'fort', '20')]),
    ]);
    const body = await (await GET()).json();
    expect(body.profils.map((p: { userId: string }) => p.userId)).toEqual([U2, U1]);
    expect(body.profils[0].ageEnDoute).toBe(true);
  });

  it('un profil tranché ne revient que sur un signal postérieur à la décision', async () => {
    const decision = { decision: 'rien', decidedAt: new Date('2026-09-22') };
    fakeDb.user.findMany.mockResolvedValue([
      compte(U1, [sig('contact_photo', 'fort', '21')], decision),
      compte(U2, [sig('contact_photo', 'fort', '21'), sig('signalement_faux', 'fort', '23')], decision),
    ]);
    const body = await (await GET()).json();
    expect(body.profils.map((p: { userId: string }) => p.userId)).toEqual([U2]);
  });
});

describe('PUT /api/admin/profils-a-verifier/[userId]', () => {
  it('« Demander une vérification » met en retrait et journalise', async () => {
    const res = await decider(U1, { decision: 'verification' });
    expect(res.status).toBe(200);
    expect(fakeDb.user.update).toHaveBeenCalledWith({ where: { id: U1 }, data: { retraitAt: expect.any(Date) } });
    expect(fakeDb.profileReview.upsert.mock.calls[0][0].create).toMatchObject({ userId: U1, decision: 'verification', decidedBy: ADMIN });
    expect(fakeDb.moderationLog.create).toHaveBeenCalledWith({ data: { adminId: ADMIN, targetUserId: U1, action: 'PROFILE_REVIEW_VERIFICATION', reason: null } });
  });

  it('« Bannir » passe par le bannissement', async () => {
    await decider(U1, { decision: 'banni' });
    expect(fakeDb.user.update).toHaveBeenCalledWith({ where: { id: U1 }, data: { isBanned: true } });
    expect(fakeDb.moderationLog.create.mock.calls[0][0].data.action).toBe('PROFILE_REVIEW_BANNI');
  });

  it('« Rien à signaler » lève une éventuelle mise en retrait', async () => {
    await decider(U1, { decision: 'rien' });
    expect(fakeDb.user.update).toHaveBeenCalledWith({ where: { id: U1 }, data: { retraitAt: null } });
    expect(fakeDb.moderationLog.create.mock.calls[0][0].data.action).toBe('PROFILE_REVIEW_RIEN');
  });

  it('refuse une décision inconnue', async () => {
    expect((await decider(U1, { decision: 'supprimer' })).status).toBe(400);
    expect(fakeDb.user.update).not.toHaveBeenCalled();
  });

  it('refuse de se trancher soi-même', async () => {
    expect((await decider(ADMIN, { decision: 'banni' })).status).toBe(400);
  });
});
