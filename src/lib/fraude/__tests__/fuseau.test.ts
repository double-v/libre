import { describe, it, expect } from 'vitest';
import { fuseauIncoherent } from '../fuseau';

describe('fuseauIncoherent (spec 010, FR-007)', () => {
  it.each([
    ['Europe/Paris', 'France', false],
    ['Europe/Lisbon', 'France', false],
    ['Atlantic/Canary', 'France', false],
    ['Indian/Reunion', 'France', false],
    ['America/Guadeloupe', 'France', false],
    ['Pacific/Noumea', 'France', false],
    ['Africa/Lagos', 'France', true],
    ['Africa/Abidjan', 'France', true],
    ['America/New_York', 'France', true],
    ['Asia/Manila', 'France', true],
  ])('%s pour une ville en %s → %s', (tz, pays, attendu) => {
    expect(fuseauIncoherent(tz, pays)).toBe(attendu);
  });

  it('ville hors de France : rien à comparer', () => {
    expect(fuseauIncoherent('America/New_York', 'Belgique')).toBe(false);
  });

  it.each([undefined, '', 'UTC', 'Etc/GMT+1', 'GMT', 'n’importe quoi', 'Africa/../Paris'])('fuseau indéterminé « %s » → aucun indice', (tz) => {
    expect(fuseauIncoherent(tz, 'France')).toBe(false);
  });
});
