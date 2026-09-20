/**
 * Tests — règles pures du parcours d'accueil (spec 005).
 *
 * `deriveMissing` pilote la carte de relance (FR-017, ordre photo > cherche >
 * position) ; `mustOnboard` la garde de Découvrir (FR-010/011/023 après
 * migration) ; `nextStep` l'écriture serveur (jamais de recul) ; `NUDGE_COPY`
 * la charte (FR-020 : aucun chiffre, aucune référence aux autres).
 */
import { describe, it, expect } from 'vitest';
import {
  deriveMissing,
  mustOnboard,
  nextStep,
  NUDGE_COPY,
  ONBOARDING_DONE,
  type OnboardingProfile,
} from '../onboarding';

const full: OnboardingProfile = {
  photos: ['a.jpg'],
  relationshipType: ['libre'],
  lastGeolocAt: new Date(),
  cityLabel: null,
  onboardingStep: 3,
};

describe('deriveMissing', () => {
  it('la photo d’abord, même si tout le reste manque', () => {
    expect(deriveMissing({ ...full, photos: [], relationshipType: [], lastGeolocAt: null })).toBe('photo');
  });
  it('puis ce que je cherche', () => {
    expect(deriveMissing({ ...full, relationshipType: [], lastGeolocAt: null })).toBe('seeking');
  });
  it('puis la position — une ville saisie vaut une position', () => {
    expect(deriveMissing({ ...full, lastGeolocAt: null })).toBe('position');
    expect(deriveMissing({ ...full, lastGeolocAt: null, cityLabel: 'Nantes (44)' })).toBeNull();
  });
  it('rien ne manque → null', () => {
    expect(deriveMissing(full)).toBeNull();
  });
});

describe('mustOnboard', () => {
  it('vrai tant que le parcours n’est pas à 3', () => {
    expect(mustOnboard({ ...full, onboardingStep: 0 })).toBe(true);
    expect(mustOnboard({ ...full, onboardingStep: 2 })).toBe(true);
    expect(mustOnboard({ ...full, onboardingStep: 3 })).toBe(false);
  });
  it('un profil absent est traité comme un parcours à 0', () => {
    expect(mustOnboard(null)).toBe(true);
  });
  it('un profil sans le champ (réponse partielle) n’envoie pas dans le tunnel', () => {
    expect(mustOnboard({})).toBe(false);
  });
});

describe('nextStep', () => {
  it('avance', () => expect(nextStep(1, 2)).toBe(2));
  it('ne recule jamais — un onglet en retard ne défait pas le parcours', () => {
    expect(nextStep(2, 1)).toBe(2);
  });
  it('plafonne à terminé', () => expect(nextStep(3, 7)).toBe(ONBOARDING_DONE));
});

describe('NUDGE_COPY — charte', () => {
  const kinds = Object.keys(NUDGE_COPY) as Array<keyof typeof NUDGE_COPY>;
  it('couvre les trois manques', () => {
    expect(kinds.sort()).toEqual(['photo', 'position', 'seeking']);
  });
  it.each(kinds)('%s : aucun chiffre, aucune référence aux autres membres', (kind) => {
    const text = `${NUDGE_COPY[kind].title} ${NUDGE_COPY[kind].body}`;
    expect(text).not.toMatch(/\d/);
    expect(text.toLowerCase()).not.toMatch(/personnes|membres|likes?\b|t'attend/);
  });
  it.each(kinds)('%s : mène à une section du profil', (kind) => {
    expect(NUDGE_COPY[kind].href).toMatch(/^\/profile#profile-section-/);
  });
});
