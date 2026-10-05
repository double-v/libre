import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

const fakeDb = {
  bannedIdentityFingerprint: { findMany: vi.fn() },
  user: { findMany: vi.fn() },
  signupTrace: { create: vi.fn(), findMany: vi.fn() },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));
const enregistrerSignal = vi.fn();
vi.mock('../signaux', () => ({ enregistrerSignal }));

const secretAvant = process.env.NEXTAUTH_SECRET;
process.env.NEXTAUTH_SECRET = 'secret-de-test';
afterAll(() => { process.env.NEXTAUTH_SECRET = secretAvant; });

const { analyserInscription } = await import('../inscription');
const { hmacIdentite } = await import('../empreinte-identite');

const NOW = new Date('2026-10-06T12:00:00Z');
const base = { userId: 'neuf', deviceId: 'dev-1', normalizedEmail: 'lola@example.test', ip: '203.0.113.7' };

beforeEach(() => {
  vi.clearAllMocks();
  fakeDb.bannedIdentityFingerprint.findMany.mockResolvedValue([]);
  fakeDb.user.findMany.mockResolvedValue([]);
  fakeDb.signupTrace.findMany.mockResolvedValue([{ userId: 'neuf' }]);
});

const types = () => enregistrerSignal.mock.calls.map((c) => c[0].type);

describe('retour d’un banni (FR-003)', () => {
  it('cherche les empreintes HMAC, jamais les valeurs en clair', async () => {
    await analyserInscription(base, NOW);
    const { where } = fakeDb.bannedIdentityFingerprint.findMany.mock.calls[0][0];
    expect(JSON.stringify(where)).not.toMatch(/dev-1|lola/);
    expect(where.OR).toEqual([
      { kind: 'appareil', hash: hmacIdentite('appareil', 'dev-1') },
      { kind: 'email', hash: hmacIdentite('email', 'lola@example.test') },
    ]);
  });

  it('une correspondance par sorte → un signal fort par sorte', async () => {
    fakeDb.bannedIdentityFingerprint.findMany.mockResolvedValue([{ kind: 'email' }, { kind: 'email' }]);
    await analyserInscription(base, NOW);
    expect(enregistrerSignal).toHaveBeenCalledWith({ userId: 'neuf', type: 'retour_banni', force: 'fort', cle: 'email' });
    expect(types()).toEqual(['retour_banni']);
  });
});

describe('appareil partagé (FR-006)', () => {
  it('indice faible sur les deux comptes actifs', async () => {
    fakeDb.user.findMany.mockResolvedValue([{ id: 'ancien' }]);
    await analyserInscription(base, NOW);
    expect(enregistrerSignal).toHaveBeenCalledWith({ userId: 'neuf', type: 'appareil_partage', force: 'faible', autreUserId: 'ancien' });
    expect(enregistrerSignal).toHaveBeenCalledWith({ userId: 'ancien', type: 'appareil_partage', force: 'faible', autreUserId: 'neuf' });
    expect(fakeDb.user.findMany.mock.calls[0][0].where).toMatchObject({ deviceId: 'dev-1', isBanned: false, id: { not: 'neuf' } });
  });

  it('sans identifiant d’appareil, rien à comparer', async () => {
    await analyserInscription({ ...base, deviceId: null }, NOW);
    expect(fakeDb.user.findMany).not.toHaveBeenCalled();
  });
});

describe('inscriptions groupées (FR-009)', () => {
  it('trace l’IP en HMAC seulement', async () => {
    await analyserInscription(base, NOW);
    const { data } = fakeDb.signupTrace.create.mock.calls[0][0];
    expect(data).toEqual({ ipHash: hmacIdentite('ip', '203.0.113.7'), userId: 'neuf' });
  });

  it('trois inscriptions en 24 h depuis la même connexion → indice faible sur chacune', async () => {
    fakeDb.signupTrace.findMany.mockResolvedValue([{ userId: 'a' }, { userId: 'b' }, { userId: 'neuf' }]);
    await analyserInscription(base, NOW);
    const cibles = enregistrerSignal.mock.calls.filter((c) => c[0].type === 'inscriptions_groupees').map((c) => c[0].userId);
    expect(cibles.sort()).toEqual(['a', 'b', 'neuf']);
    expect(fakeDb.signupTrace.findMany.mock.calls[0][0].where.createdAt.gte).toEqual(new Date(NOW.getTime() - 86400_000));
  });

  it('deux inscriptions → rien', async () => {
    fakeDb.signupTrace.findMany.mockResolvedValue([{ userId: 'a' }, { userId: 'neuf' }]);
    await analyserInscription(base, NOW);
    expect(types()).not.toContain('inscriptions_groupees');
  });

  it('IP inconnue : aucune trace', async () => {
    await analyserInscription({ ...base, ip: 'unknown' }, NOW);
    expect(fakeDb.signupTrace.create).not.toHaveBeenCalled();
  });
});

it('ne jette jamais', async () => {
  fakeDb.bannedIdentityFingerprint.findMany.mockRejectedValue(new Error('panne'));
  fakeDb.user.findMany.mockRejectedValue(new Error('panne'));
  fakeDb.signupTrace.create.mockRejectedValue(new Error('panne'));
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  await expect(analyserInscription(base, NOW)).resolves.toBeUndefined();
  warn.mockRestore();
});
