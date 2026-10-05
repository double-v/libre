import { describe, it, expect } from 'vitest';
import { douteSerieux, niveauFiabilite, signauxRecents } from '../fiabilite';

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
