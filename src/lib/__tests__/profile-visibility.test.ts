/**
 * Tests — règle de visibilité des pratiques (#328).
 *
 * La règle vit dans une fonction pure pour que les deux routes qui exposaient
 * le champ ne puissent plus diverger. Ce qui compte ici : le sens de l'échec.
 */
import { describe, it, expect } from 'vitest';
import { canSeePractices, DEFAULT_PRACTICES_VISIBILITY } from '../profile-visibility';

describe('canSeePractices', () => {
  it('laisse toujours voir ses propres pratiques', () => {
    expect(canSeePractices({ visibility: 'matches', isSelf: true, isMatched: false })).toBe(true);
  });

  it('ouvre à tous quand le profil a choisi « public »', () => {
    expect(canSeePractices({ visibility: 'public', isSelf: false, isMatched: false })).toBe(true);
  });

  it('ferme aux non-matches quand le profil a choisi « matches »', () => {
    expect(canSeePractices({ visibility: 'matches', isSelf: false, isMatched: false })).toBe(false);
  });

  it('ouvre aux matches quand le profil a choisi « matches »', () => {
    expect(canSeePractices({ visibility: 'matches', isSelf: false, isMatched: true })).toBe(true);
  });

  it('ferme sur toute valeur inconnue ou absente — l\'échec ne doit jamais ouvrir', () => {
    for (const visibility of [null, undefined, '', 'PUBLIC', 'publique', 'nimportequoi']) {
      expect(canSeePractices({ visibility, isSelf: false, isMatched: false })).toBe(false);
    }
  });

  it('a un défaut restrictif, conforme à la promesse affichée dans /profil', () => {
    expect(DEFAULT_PRACTICES_VISIBILITY).toBe('matches');
  });
});
