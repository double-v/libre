/**
 * Tests — règle de visibilité des pratiques (#328).
 *
 * La règle vit dans une fonction pure pour que les deux routes qui exposaient
 * le champ ne puissent plus diverger. Ce qui compte ici : le sens de l'échec.
 */
import { describe, it, expect } from 'vitest';
import {
  canSeePractices,
  DEFAULT_PRACTICES_VISIBILITY,
  hasDeclaredIntention,
  intentionFor,
} from '../profile-visibility';

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

/**
 * Réciprocité miroir sur l'intention (spec 008, #452/#453) : « tu vois ce que
 * tu montres ». La table de data-model.md, ligne par ligne.
 */
describe('hasDeclaredIntention', () => {
  it('une liste vide n\'est pas une déclaration', () => {
    expect(hasDeclaredIntention([])).toBe(false);
  });

  it('« je verrai en chemin » compte comme une réponse', () => {
    expect(hasDeclaredIntention(['je verrai en chemin'])).toBe(true);
  });

  it('une lectrice inconnue n\'a rien déclaré (fermé par défaut)', () => {
    expect(hasDeclaredIntention(null)).toBe(false);
    expect(hasDeclaredIntention(undefined)).toBe(false);
  });
});

describe('intentionFor', () => {
  it('ne voile jamais sa propre intention', () => {
    expect(intentionFor({ isSelf: true, viewerIntention: [], relationshipType: ['sérieux'] }))
      .toEqual({ relationshipType: ['sérieux'] });
  });

  it('montre l\'intention à une lectrice qui a déclaré la sienne', () => {
    expect(intentionFor({ isSelf: false, viewerIntention: ['poly'], relationshipType: ['sérieux'] }))
      .toEqual({ relationshipType: ['sérieux'] });
  });

  it('rien à dévoiler : liste vide, sans marqueur de voile', () => {
    expect(intentionFor({ isSelf: false, viewerIntention: [], relationshipType: [] }))
      .toEqual({ relationshipType: [] });
  });

  it('voile l\'intention pour une lectrice qui n\'a rien déclaré', () => {
    const r = intentionFor({ isSelf: false, viewerIntention: [], relationshipType: ['sérieux'] });
    expect(r).toEqual({ relationshipTypeVeiled: true });
    expect(r).not.toHaveProperty('relationshipType');
  });

  it('voile quand la lectrice est inconnue', () => {
    expect(intentionFor({ isSelf: false, viewerIntention: undefined, relationshipType: ['libre'] }))
      .toEqual({ relationshipTypeVeiled: true });
  });

  it('traite une intention absente en base comme une liste vide', () => {
    expect(intentionFor({ isSelf: false, viewerIntention: ['poly'], relationshipType: null }))
      .toEqual({ relationshipType: [] });
  });
});
