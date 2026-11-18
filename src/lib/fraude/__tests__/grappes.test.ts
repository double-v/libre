import { describe, expect, it } from 'vitest';
import { construireGrappes, ecartLisible, type CompteIndice, type Lien } from '../grappes';

const t0 = new Date('2026-09-14T21:02:00Z');
const plus = (min: number) => new Date(t0.getTime() + min * 60_000);

function compte(id: string, o: Partial<CompteIndice> = {}): CompteIndice {
  return { id, displayName: `Membre ${id}`, createdAt: t0, emailConfirme: true, niveau: 'a_surveiller', types: [], dernierSignal: t0, ...o };
}

describe('construireGrappes (spec 011, US2)', () => {
  it('relie deux comptes du même appareil et les classe en doublon probable', () => {
    const comptes = [
      compte('a', { emailConfirme: false, types: ['appareil_partage'] }),
      compte('b', { createdAt: plus(6), types: ['appareil_partage'] }),
    ];
    // Le lien est écrit des deux côtés : il ne compte qu'une fois.
    const liens: Lien[] = [{ de: 'a', vers: 'b', sorte: 'appareil' }, { de: 'b', vers: 'a', sorte: 'appareil' }];
    const [g] = construireGrappes(comptes, liens);
    expect(g.comptes.map((c) => c.id)).toEqual(['a', 'b']);
    expect(g.liens).toHaveLength(1);
    expect(g.doublon).toEqual({ orphelinId: 'a', gardeId: 'b' });
    expect(g.raisons[0]).toBe('Membre a et Membre b ont été créés sur le même appareil, à 6 minutes d’écart.');
    expect(g.raisons[1]).toMatch(/^Membre a n’a jamais confirmé son adresse e-mail/);
    expect(g.mentions).toHaveLength(1);
  });

  it.each([
    ['les deux confirmés', true, true],
    ['aucun confirmé', false, false],
  ])('pas de doublon quand %s', (_cas, a, b) => {
    const [g] = construireGrappes(
      [compte('a', { emailConfirme: a }), compte('b', { emailConfirme: b })],
      [{ de: 'a', vers: 'b', sorte: 'appareil' }],
    );
    expect(g.doublon).toBeNull();
  });

  it('pas de doublon pour une photo partagée, même si un seul compte est confirmé', () => {
    const [g] = construireGrappes(
      [compte('a', { emailConfirme: false }), compte('b')],
      [{ de: 'a', vers: 'b', sorte: 'photo' }],
    );
    expect(g.doublon).toBeNull();
    expect(g.raisons[0]).toBe('La même photo apparaît sur les profils de Membre a et Membre b.');
  });

  it('regroupe trois comptes par la connexion et dit l’écart total', () => {
    const comptes = [compte('a'), compte('b', { createdAt: plus(21) }), compte('c', { createdAt: plus(40) })];
    const liens: Lien[] = [{ de: 'a', vers: 'b', sorte: 'connexion' }, { de: 'b', vers: 'c', sorte: 'connexion' }];
    const grappes = construireGrappes(comptes, liens);
    expect(grappes).toHaveLength(1);
    expect(grappes[0].raisons[0]).toBe('3 comptes se sont inscrits depuis la même connexion en 40 minutes.');
    expect(grappes[0].doublon).toBeNull();
  });

  it('un compte sans lien forme une grappe seule, avec ses indices nommés', () => {
    const [g] = construireGrappes([compte('a', { types: ['likes_rafale', 'likes_rafale'] })], []);
    expect(g.comptes).toHaveLength(1);
    expect(g.raisons).toEqual(['Membre a : likes en rafale juste après l’inscription.']);
  });

  it('ignore un lien vers un compte absent (supprimé ou dossier clos)', () => {
    const grappes = construireGrappes([compte('a')], [{ de: 'a', vers: 'disparu', sorte: 'photo' }]);
    expect(grappes).toHaveLength(1);
    expect(grappes[0].liens).toHaveLength(0);
  });

  it('trie du plus douteux au plus fiable, puis du plus récent au plus ancien', () => {
    const grappes = construireGrappes(
      [
        compte('a', { niveau: 'a_surveiller', dernierSignal: plus(100) }),
        compte('b', { niveau: 'douteux', dernierSignal: plus(1) }),
        compte('c', { niveau: 'a_surveiller', dernierSignal: plus(200) }),
      ],
      [],
    );
    expect(grappes.map((g) => g.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('ecartLisible', () => {
  it.each([
    [30_000, '1 minute'],
    [6 * 60_000, '6 minutes'],
    [2 * 3_600_000, '2 heures'],
    [3 * 86_400_000, '3 jours'],
  ])('%i ms → %s', (ms, attendu) => {
    expect(ecartLisible(ms)).toBe(attendu);
  });
});
