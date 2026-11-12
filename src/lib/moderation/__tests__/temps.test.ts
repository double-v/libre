import { describe, it, expect } from 'vitest';
import { duree, ilYa, vuLe } from '../temps';

const MAINTENANT = new Date('2026-11-12T12:00:00Z');
const avant = (ms: number) => new Date(MAINTENANT.getTime() - ms).toISOString();
const MIN = 60_000;
const H = 60 * MIN;
const J = 24 * H;

describe('durée écoulée, en français', () => {
  it.each([
    [10_000, 'moins d’une minute'],
    [38 * MIN, '38 min'],
    [59 * MIN, '59 min'],
    [6 * H, '6 h'],
    [23 * H + 59 * MIN, '23 h'],
    [2 * J, '2 j'],
    [29 * J, '29 j'],
    [61 * J, '2 mois'],
    [400 * J, '1 an'],
    [800 * J, '2 ans'],
  ])('%i ms → %s', (ms, attendu) => expect(duree(avant(ms), MAINTENANT)).toBe(attendu));
  it('une date future vaut « à l’instant »', () => expect(ilYa(new Date(MAINTENANT.getTime() + H).toISOString(), MAINTENANT)).toBe('à l’instant'));
  it('ilYa préfixe', () => expect(ilYa(avant(6 * H), MAINTENANT)).toBe('il y a 6 h'));
  it('moins d’une minute : à l’instant', () => expect(ilYa(avant(1000), MAINTENANT)).toBe('à l’instant'));
});

describe('dernière visite, au jour près', () => {
  it.each([
    [null, 'jamais vu'],
    ['2026-11-12', 'vu aujourd’hui'],
    ['2026-11-11', 'vu hier'],
    ['2026-11-09', 'vu il y a 3 j'],
    ['2026-08-01', 'vu il y a 3 mois'],
  ])('%s → %s', (jour, attendu) => expect(vuLe(jour, MAINTENANT)).toBe(attendu));
});
