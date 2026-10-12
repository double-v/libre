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
  deriveIdentite,
  mustOnboard,
  nextStep,
  NUDGE_COPY,
  NUDGE_IDENTITE_COPY,
  MIRROR_COPY,
  shouldInviteDistance,
  ONBOARDING_DONE,
  type OnboardingProfile,
} from '../onboarding';

const full: OnboardingProfile = {
  photos: ['a.jpg'],
  relationshipType: ['libre'],
  lastGeolocAt: new Date(),
  cityLabel: null,
  onboardingStep: 3,
  genderIdentity: 'femme',
  orientation: ['hétéro'],
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

/** Invitations de la réciprocité miroir (spec 008) : même charte que la relance. */
describe('MIRROR_COPY — charte', () => {
  it.each(Object.entries(MIRROR_COPY))('%s : aucun chiffre, aucune référence comptée aux autres', (_k, text) => {
    expect(text).not.toMatch(/\d/);
    expect(text.toLowerCase()).not.toMatch(/personnes|membres|likes?\b|t'attend/);
  });
});

/**
 * Le rang d'identité (#517) : après tous les manques du parcours, un nudge
 * qui dit l'effet (les recherches filtrées) et déclare en ligne.
 */
describe('deriveIdentite', () => {
  it('le genre d\'abord, l\'orientation ensuite', () => {
    expect(deriveIdentite({ genderIdentity: '', orientation: [] })).toBe('genre');
    expect(deriveIdentite({ genderIdentity: 'femme', orientation: [] })).toBe('orientation');
  });
  it('« Je ne souhaite pas le préciser » reste un silence (#519)', () => {
    expect(deriveIdentite({ genderIdentity: '', orientation: ['hétéro'] })).toBe('genre');
  });
  it('tout déclaré → null', () => {
    expect(deriveIdentite({ genderIdentity: 'femme', orientation: ['hétéro'] })).toBeNull();
  });
});

describe('NUDGE_IDENTITE_COPY — charte (#517)', () => {
  const manques = Object.keys(NUDGE_IDENTITE_COPY) as Array<keyof typeof NUDGE_IDENTITE_COPY>;
  it('couvre les deux déclarations', () => {
    expect(manques.sort()).toEqual(['genre', 'orientation']);
  });
  it.each(manques)('%s : aucun chiffre, aucune référence aux autres membres', (kind) => {
    const text = `${NUDGE_IDENTITE_COPY[kind].title} ${NUDGE_IDENTITE_COPY[kind].body}`;
    expect(text).not.toMatch(/\d/);
    expect(text.toLowerCase()).not.toMatch(/personnes|membres|likes?\b|t'attend/);
  });
  // L'absence reste invisible publiquement (#517) : rien n'annonce l'absence
  // d'autrui dans la copie — la carte parle aux siens, pour son profil seul.
  it.each(manques)('%s : parle au propriétaire de son profil seul', (kind) => {
    expect(NUDGE_IDENTITE_COPY[kind].champ).toMatch(/^Ton /);
  });
});

/**
 * Bandeau distance (spec 008, #454) : une seule invitation, et seulement
 * quand rien d'autre à l'écran ne dit déjà la même chose.
 */
describe('shouldInviteDistance', () => {
  const base = { hasPosition: false, nudgeKind: null, geolocBannerShown: false } as const;

  it('invite une lectrice sans position', () => {
    expect(shouldInviteDistance(base)).toBe(true);
  });

  it('se tait quand la lectrice a une position', () => {
    expect(shouldInviteDistance({ ...base, hasPosition: true })).toBe(false);
  });

  it('se tait quand la carte de relance parle déjà de la position', () => {
    expect(shouldInviteDistance({ ...base, nudgeKind: 'position' })).toBe(false);
  });

  it('reste là quand la carte de relance parle d\'autre chose', () => {
    expect(shouldInviteDistance({ ...base, nudgeKind: 'photo' })).toBe(true);
  });

  it('se tait quand l\'encart « filtre de distance » est déjà affiché', () => {
    expect(shouldInviteDistance({ ...base, geolocBannerShown: true })).toBe(false);
  });
});
