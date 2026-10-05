import { describe, it, expect, vi, beforeEach } from 'vitest';

const blockFindMany = vi.fn();
const likeFindMany = vi.fn();
const likeCount = vi.fn();
const userFindUnique = vi.fn();
vi.mock('@/lib/db', () => ({
  __esModule: true,
  getDb: () => ({ block: { findMany: blockFindMany }, like: { findMany: likeFindMany, count: likeCount }, user: { findUnique: userFindUnique } }),
}));
const enregistrerSignal = vi.fn();
vi.mock('../signaux', () => ({ enregistrerSignal }));

const { verifierBlocages, verifierRythmeLikes, verifierProfilExpress, maxDansFenetre } = await import('../comportement');

const NOW = new Date('2026-10-06T12:00:00Z');
const min = (n: number) => new Date(NOW.getTime() - n * 60_000);

beforeEach(() => vi.clearAllMocks());

describe('verifierBlocages (FR-001)', () => {
  it('3 bloqueurs anciens en 48 h → signal fort', async () => {
    blockFindMany.mockResolvedValue([{ blockerId: 'a' }, { blockerId: 'b' }, { blockerId: 'c' }]);
    await verifierBlocages('x', NOW);
    expect(enregistrerSignal).toHaveBeenCalledWith({ userId: 'x', type: 'bloque_repetition', force: 'fort', cle: '2026-10-06' });
  });

  it('la requête ne compte que 48 h et des bloqueurs inscrits depuis 7 jours', async () => {
    blockFindMany.mockResolvedValue([]);
    await verifierBlocages('x', NOW);
    const { where } = blockFindMany.mock.calls[0][0];
    expect(where.blockedId).toBe('x');
    expect(where.createdAt.gte).toEqual(new Date(NOW.getTime() - 48 * 3600_000));
    expect(where.blocker.createdAt.lte).toEqual(new Date(NOW.getTime() - 7 * 86400_000));
  });

  it('deux bloqueurs → rien', async () => {
    blockFindMany.mockResolvedValue([{ blockerId: 'a' }, { blockerId: 'b' }]);
    await verifierBlocages('x', NOW);
    expect(enregistrerSignal).not.toHaveBeenCalled();
  });
});

describe('maxDansFenetre', () => {
  it('compte le plus grand nombre d’instants dans une fenêtre glissante', () => {
    const t = [0, 1, 2, 30, 31].map(min).reverse();
    expect(maxDansFenetre(t, 10 * 60_000)).toBe(3);
    expect(maxDansFenetre([], 1000)).toBe(0);
  });
});

describe('verifierRythmeLikes (FR-005)', () => {
  const rafale = (n: number, ecartSec: number, debutMin = 0) =>
    Array.from({ length: n }, (_, i) => ({ createdAt: new Date(min(debutMin).getTime() - i * ecartSec * 1000) }));

  it('30 likes en 24 h dont 15 en 10 min sur un compte neuf → signal', async () => {
    userFindUnique.mockResolvedValue({ createdAt: min(120) });
    likeFindMany.mockResolvedValue([...rafale(15, 20), ...rafale(15, 600, 60)]);
    await verifierRythmeLikes('x', NOW);
    expect(enregistrerSignal).toHaveBeenCalledWith({ userId: 'x', type: 'likes_rafale', force: 'fort', cle: '2026-10-06' });
  });

  it('30 likes étalés sur la journée → rien', async () => {
    userFindUnique.mockResolvedValue({ createdAt: min(120) });
    likeFindMany.mockResolvedValue(rafale(30, 2400));
    await verifierRythmeLikes('x', NOW);
    expect(enregistrerSignal).not.toHaveBeenCalled();
  });

  it('une rafale de 20 likes sans atteindre 30 → rien', async () => {
    userFindUnique.mockResolvedValue({ createdAt: min(120) });
    likeFindMany.mockResolvedValue(rafale(20, 10));
    await verifierRythmeLikes('x', NOW);
    expect(enregistrerSignal).not.toHaveBeenCalled();
  });

  it('compte de plus de 7 jours → aucune lecture des likes', async () => {
    userFindUnique.mockResolvedValue({ createdAt: new Date(NOW.getTime() - 8 * 86400_000) });
    await verifierRythmeLikes('x', NOW);
    expect(likeFindMany).not.toHaveBeenCalled();
  });
});

describe('verifierProfilExpress (FR-008)', () => {
  it('photo, bio et 10 likes moins de 15 min après la vérification → indice faible', async () => {
    userFindUnique.mockResolvedValue({ emailVerified: min(12), profile: { photos: ['p1'], bio: 'Bonjour' } });
    likeCount.mockResolvedValue(10);
    await verifierProfilExpress('x', NOW);
    expect(enregistrerSignal).toHaveBeenCalledWith({ userId: 'x', type: 'profil_express', force: 'faible', cle: 'express' });
  });

  it.each([
    ['plus de 15 minutes après', { emailVerified: min(20), profile: { photos: ['p1'], bio: 'b' } }, 10],
    ['sans photo', { emailVerified: min(5), profile: { photos: [], bio: 'b' } }, 10],
    ['sans bio', { emailVerified: min(5), profile: { photos: ['p1'], bio: '' } }, 10],
    ['9 likes', { emailVerified: min(5), profile: { photos: ['p1'], bio: 'b' } }, 9],
    ['e-mail non vérifié', { emailVerified: null, profile: { photos: ['p1'], bio: 'b' } }, 10],
  ])('%s → rien', async (_l, u, likes) => {
    userFindUnique.mockResolvedValue(u);
    likeCount.mockResolvedValue(likes);
    await verifierProfilExpress('x', NOW);
    expect(enregistrerSignal).not.toHaveBeenCalled();
  });
});
