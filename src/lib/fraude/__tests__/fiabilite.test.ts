import { describe, it, expect } from 'vitest';
import { douteSerieux, fiabiliteParCompte, niveauFiabilite, signauxRecents } from '../fiabilite';

const s = (type: string, force: 'fort' | 'faible', jour = 1) => ({ type, force, createdAt: new Date(2026, 9, jour) });

describe('douteSerieux (FR-014)', () => {
  it.each([
    ['aucun signal', [], false],
    ['un signal fort', [s('lexique_arnaque', 'fort')], true],
    ['la rafale de likes', [s('likes_rafale', 'fort')], true],
    ['un indice faible seul', [s('appareil_partage', 'faible')], false],
    ['deux faibles de types différents', [s('appareil_partage', 'faible'), s('fuseau_incoherent', 'faible')], false],
    ['trois faibles du même type', [s('appareil_partage', 'faible'), s('appareil_partage', 'faible'), s('appareil_partage', 'faible')], false],
    ['trois faibles de types différents', [s('appareil_partage', 'faible'), s('fuseau_incoherent', 'faible'), s('profil_express', 'faible')], true],
  ])('%s → %s', (_l, signaux, attendu) => {
    expect(douteSerieux(signaux)).toBe(attendu);
  });
});

describe('niveauFiabilite', () => {
  it('fiable sans signal', () => {
    expect(niveauFiabilite([], false)).toBe('fiable');
  });
  it('à surveiller dès un indice non tranché', () => {
    expect(niveauFiabilite([s('appareil_partage', 'faible')], false)).toBe('a_surveiller');
  });
  it('douteux sur un doute sérieux', () => {
    expect(niveauFiabilite([s('retour_banni', 'fort')], false)).toBe('douteux');
  });
  it('le badge vérifié fait baisser d’un cran (FR-013)', () => {
    expect(niveauFiabilite([s('retour_banni', 'fort')], true)).toBe('a_surveiller');
    expect(niveauFiabilite([s('appareil_partage', 'faible')], true)).toBe('fiable');
  });
});

describe('signauxRecents', () => {
  it('écarte les signaux tranchés par une décision « rien à signaler »', () => {
    const r = signauxRecents([s('lexique_arnaque', 'fort', 1), s('appareil_partage', 'faible', 5)], new Date(2026, 9, 3));
    expect(r.map((x) => x.type)).toEqual(['appareil_partage']);
  });
  it('garde tout sans décision', () => {
    expect(signauxRecents([s('lexique_arnaque', 'fort')], null)).toHaveLength(1);
  });
});

describe('fiabiliteParCompte', () => {
  const sig = (userId: string, type: string, force: 'fort' | 'faible', jour = 5) => ({ userId, type, force, createdAt: new Date(2026, 9, jour) });

  it('un niveau par compte signalé, avec le nombre de signaux non tranchés', () => {
    const m = fiabiliteParCompte(
      [sig('a', 'lexique_arnaque', 'fort'), sig('b', 'appareil_partage', 'faible'), sig('b', 'fuseau_incoherent', 'faible')],
      new Map(),
      new Set(),
    );
    expect(m.get('a')).toEqual({ niveau: 'douteux', signauxRecents: 1 });
    expect(m.get('b')).toEqual({ niveau: 'a_surveiller', signauxRecents: 2 });
    expect(m.has('c')).toBe(false);
  });

  it('applique la décision et le badge de chaque compte', () => {
    const m = fiabiliteParCompte(
      [sig('a', 'lexique_arnaque', 'fort', 1), sig('v', 'retour_banni', 'fort')],
      new Map([['a', new Date(2026, 9, 3)]]),
      new Set(['v']),
    );
    expect(m.get('a')).toEqual({ niveau: 'fiable', signauxRecents: 0 });
    expect(m.get('v')?.niveau).toBe('a_surveiller');
  });
});
