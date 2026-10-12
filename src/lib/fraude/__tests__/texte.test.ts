import { describe, it, expect, vi, beforeEach } from 'vitest';

const fakeDb = {
  bioFingerprint: { upsert: vi.fn(), findMany: vi.fn() },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));
const enregistrerSignal = vi.fn();
vi.mock('../signaux', () => ({ enregistrerSignal }));

const { comparerBio, empreinteBio } = await import('../texte');

const BIO = 'J’aime les balades au bord de la mer et les concerts en petit comité. Je cherche quelqu’un de simple et de sincère.';

beforeEach(() => {
  vi.clearAllMocks();
  // La Promise.all oppose actifs (1 re) et bannis (2 e) : le mock lit le where.
  fakeDb.bioFingerprint.findMany.mockImplementation((args: { where: { user: { isBanned: boolean } } }) =>
    args.where.user.isBanned ? Promise.resolve([]) : Promise.resolve([]),
  );
});

describe('empreinte de la bio (#514)', () => {
  it('normalise casse, accents, ponctuation et espaces', () => {
    const a = empreinteBio(BIO);
    // « é » scindé en e + accent grave indépendant, majuscules, ponctuation
    // ajoutée, espaces doublés : après normalisation, c'est la même bio.
    const reécrite = (BIO.replace('é', 'é') + ' , !!    ').toUpperCase().toLowerCase();
    const b = empreinteBio(reécrite);
    expect(b).toBe(a);
  });

  it('l’écriture différente a une autre empreinte', () => {
    const b = empreinteBio('Une bio complètement différente d’une autre personne, rien de pareil du tout ici.');
    expect(b).not.toBe(empreinteBio(BIO));
  });

  it('trop courte ou vide → null, donc rien à comparer', () => {
    expect(empreinteBio('Salut !')).toBeNull();
    expect(empreinteBio('   ')).toBeNull();
  });
});

describe('comparaison d’une bio (#514)', () => {
  it('retient son empreinte, jamais le texte', async () => {
    fakeDb.bioFingerprint.findMany.mockResolvedValue([]);
    await comparerBio('membre-a', BIO);
    const { create } = fakeDb.bioFingerprint.upsert.mock.calls[0][0];
    expect(create).toEqual({ userId: 'membre-a', hash: empreinteBio(BIO) });
    expect(JSON.stringify(fakeDb.bioFingerprint.upsert.mock.calls[0][0])).not.toContain('balades');
  });

  it('exclut son propre compte de la comparaison', async () => {
    fakeDb.bioFingerprint.findMany.mockResolvedValue([]);
    await comparerBio('membre-a', BIO);
    const where = fakeDb.bioFingerprint.findMany.mock.calls[0][0].where;
    expect(where.hash).toBe(empreinteBio(BIO));
    expect(where.user.id).toEqual({ not: 'membre-a' });
  });

  it('la même bio qu’un compte actif → indice faible des deux côtés', async () => {
    fakeDb.bioFingerprint.findMany.mockImplementation((args: { where: { user: { isBanned: boolean } } }) =>
      args.where.user.isBanned ? Promise.resolve([]) : Promise.resolve([{ userId: 'actif-b' }]),
    );
    await comparerBio('membre-a', BIO);
    const appels = enregistrerSignal.mock.calls.map((c) => c[0]);
    expect(appels).toContainEqual({ userId: 'membre-a', type: 'texte_reutilise', force: 'faible', cle: empreinteBio(BIO), autreUserId: 'actif-b' });
    expect(appels).toContainEqual({ userId: 'actif-b', type: 'texte_reutilise', force: 'faible', cle: empreinteBio(BIO), autreUserId: 'membre-a' });
  });

  it('la même bio qu’un banni → indice fort, sur le nouveau seul', async () => {
    fakeDb.bioFingerprint.findMany.mockImplementation((args: { where: { user: { isBanned: boolean } } }) =>
      args.where.user.isBanned ? Promise.resolve([{ userId: 'banni-x' }]) : Promise.resolve([]),
    );
    await comparerBio('membre-a', BIO);
    const appels = enregistrerSignal.mock.calls.map((c) => c[0]);
    expect(appels).toContainEqual({ userId: 'membre-a', type: 'texte_banni', force: 'fort', cle: empreinteBio(BIO), autreUserId: 'banni-x' });
    expect(enregistrerSignal.mock.calls.map((c) => c[0].userId)).toEqual(['membre-a']);
  });

  it('bio distincte → aucun signal', async () => {
    fakeDb.bioFingerprint.findMany.mockResolvedValue([]);
    await comparerBio('membre-a', BIO);
    expect(enregistrerSignal).not.toHaveBeenCalled();
  });

  it('recharger sa bio ne duplique pas la ligne', async () => {
    fakeDb.bioFingerprint.findMany.mockResolvedValue([]);
    await comparerBio('membre-a', BIO);
    await comparerBio('membre-a', BIO);
    expect(fakeDb.bioFingerprint.upsert).toHaveBeenCalledTimes(2);
    expect(fakeDb.bioFingerprint.upsert.mock.calls[1][0].where).toEqual({ userId_hash: { userId: 'membre-a', hash: empreinteBio(BIO) } });
  });

  it('ne jette jamais', async () => {
    fakeDb.bioFingerprint.upsert.mockRejectedValue(new Error('panne'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(comparerBio('membre-a', BIO)).resolves.toBeUndefined();
    warn.mockRestore();
  });
});