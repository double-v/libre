import { describe, expect, it, vi, beforeEach } from 'vitest';

const effacerCompte = vi.fn();
vi.mock('@/lib/suppression-compte', () => ({ effacerCompte: (id: string) => effacerCompte(id) }));
vi.mock('@/lib/fraude/bannissement', () => ({ retenirEmpreintesBannies: vi.fn() }));

const findUnique = vi.fn();
const logs: Array<{ targetUserId: string; action: string }> = [];
const fakeDb = {
  user: { findUnique: (a: { where: { id: string } }) => findUnique(a.where.id), update: vi.fn() },
  profileReview: { upsert: vi.fn() },
  moderationLog: { create: ({ data }: { data: { targetUserId: string; action: string } }) => { logs.push(data); } },
};
vi.mock('@/lib/db', () => ({ getDb: () => fakeDb }));

const { supprimerDoublon } = await import('../gestes');

const orphelin = (o: Record<string, unknown> = {}) => ({
  emailVerified: null,
  deviceId: 'dev-1',
  profile: { photos: [] },
  _count: { sentLikes: 0, matchesAsA: 0, matchesAsB: 0 },
  ...o,
});

function base(o: Record<string, unknown> = {}, garde: { deviceId: string | null } | null = { deviceId: 'dev-1' }) {
  findUnique.mockImplementation((id: string) => (id === 'orphelin' ? orphelin(o) : garde));
}

beforeEach(() => {
  effacerCompte.mockReset();
  findUnique.mockReset();
  logs.length = 0;
});

describe('supprimerDoublon (spec 011, US2)', () => {
  it('efface l’orphelin, clôt le dossier du compte gardé et journalise sur lui', async () => {
    base();
    expect(await supprimerDoublon('admin', 'orphelin', 'garde')).toBeNull();
    expect(effacerCompte).toHaveBeenCalledWith('orphelin');
    expect(logs.map((l) => [l.targetUserId, l.action])).toEqual([
      ['garde', 'PROFILE_REVIEW_RIEN'],
      ['garde', 'DELETE_DUPLICATE'],
    ]);
  });

  it.each([
    ['adresse confirmée entre-temps', { emailVerified: new Date() }, 'confirme'],
    ['une photo', { profile: { photos: ['k'] } }, 'actif'],
    ['un like envoyé', { _count: { sentLikes: 1, matchesAsA: 0, matchesAsB: 0 } }, 'actif'],
    ['un autre appareil', { deviceId: 'dev-2' }, 'pas_lies'],
    ['sans appareil', { deviceId: null }, 'pas_lies'],
  ])('refuse : %s', async (_cas, o, refus) => {
    base(o);
    expect(await supprimerDoublon('admin', 'orphelin', 'garde')).toBe(refus);
    expect(effacerCompte).not.toHaveBeenCalled();
    expect(logs).toHaveLength(0);
  });

  it('refuse si le compte gardé a disparu', async () => {
    base({}, null);
    expect(await supprimerDoublon('admin', 'orphelin', 'garde')).toBe('introuvable');
  });
});
