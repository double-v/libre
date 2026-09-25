/**
 * Parcours d'accueil (spec 005) — règles pures, sans React ni Prisma.
 *
 * Le parcours est linéaire et se mémorise en base par un entier
 * (`Profile.onboardingStep`) pour reprendre là où on s'est arrêté, y compris
 * depuis un autre appareil. Il ne se dérive pas du contenu du profil : une
 * étape passée sans saisie doit rester passée.
 */

export const ONBOARDING_DONE = 3;

/** Étapes du parcours, dans l'ordre. L'index est la valeur en base. */
export const ONBOARDING_STEPS = ['photo', 'seeking', 'position'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Ce qui peut manquer à un profil pour être choisi, par ordre d'impact. */
export type MissingKind = 'photo' | 'seeking' | 'position';

export interface OnboardingProfile {
  photos: string[];
  relationshipType: string[];
  lastGeolocAt: Date | string | null;
  cityLabel: string | null;
  onboardingStep: number;
}

/** Clé `localStorage` : la carte de relance a été écartée (date ISO). */
export const NUDGE_DISMISS_KEY = 'libre:nudge-dismissed';
/** Clé `localStorage` : la proposition push a déjà été faite ici (date ISO). */
export const PUSH_ASKED_KEY = 'libre:push-asked';
export const NUDGE_DISMISS_DAYS = 7;

/**
 * Premier élément manquant, dans l'ordre photo > ce que je cherche > position.
 * Une ville saisie vaut une position : c'est le repli prévu par la spec 004.
 */
export function deriveMissing(profile: OnboardingProfile): MissingKind | null {
  if (profile.photos.length === 0) return 'photo';
  if (profile.relationshipType.length === 0) return 'seeking';
  if (!profile.lastGeolocAt && !profile.cityLabel) return 'position';
  return null;
}

/**
 * Faut-il envoyer dans le parcours ? Après la migration, la règle FR-023 est
 * déjà appliquée en base : ici on ne regarde que l'avancement. Un profil
 * absent (course entre inscription et première lecture) vaut 0.
 */
export function mustOnboard(profile: Partial<Pick<OnboardingProfile, 'onboardingStep'>> | null): boolean {
  if (profile === null) return true;
  // Champ absent (réponse partielle, données d'une autre époque) : on ne
  // piège personne dans le tunnel sur une incertitude.
  if (typeof profile.onboardingStep !== 'number') return false;
  return profile.onboardingStep < ONBOARDING_DONE;
}

/** L'avancement ne recule jamais et plafonne à terminé. */
export function nextStep(current: number, requested: number): number {
  return Math.min(ONBOARDING_DONE, Math.max(current, requested));
}

/** Copie de la carte de relance : le profil de la personne, et elle seule. */
export const NUDGE_COPY: Record<MissingKind, { title: string; body: string; cta: string; href: string }> = {
  photo: {
    title: 'Ajoute une photo',
    body: "C'est ce qui donne envie de te découvrir. Une seule suffit.",
    cta: 'Ajouter une photo',
    href: '/profile#profile-section-photos',
  },
  seeking: {
    title: 'Dis ce que tu cherches',
    body: 'Les autres sauront si vous cherchez la même chose.',
    cta: 'Préciser',
    href: '/profile#profile-section-seeking',
  },
  position: {
    title: 'Indique où tu es',
    body: 'Pour croiser des gens près de chez toi. Jamais ton adresse.',
    cta: 'Indiquer ma position',
    href: '/profile#profile-section-position',
  },
};

/**
 * Invitations de la réciprocité miroir (spec 008) : « tu vois ce que tu
 * montres ». Copie validée au prototype le 2026-09-25 ; même charte que la
 * relance — aucun chiffre, aucune comparaison.
 */
export const MIRROR_COPY = {
  /** Fiche : l'intention de la personne lue est voilée pour toi. */
  intentionProfile: 'Dis ce que tu cherches pour lire ce que cherchent les autres.',
  /** Filtres : le groupe « Type de relation » est inactif. */
  intentionFilter: 'Dis ce que tu cherches pour filtrer sur ce critère.',
  /** « Pour toi » : aucune position, donc aucune distance. */
  distance: 'Partage où tu es pour voir les distances.',
} as const;

/** Où l'on dit ce que l'on cherche : même ancre que la carte de relance. */
export const SEEKING_HREF = '/profile#profile-section-seeking';

/**
 * Faut-il le bandeau « Partage où tu es pour voir les distances » en tête de
 * « Pour toi » (spec 008) ? Une seule invitation par écran : pas si la carte
 * de relance dit déjà « Indique où tu es », ni si l'encart du filtre de
 * distance (même geste) est affiché. L'absence de position de l'autre
 * personne ne compte pas : ce n'est pas à la lectrice d'agir.
 */
export function shouldInviteDistance(opts: {
  hasPosition: boolean;
  nudgeKind: MissingKind | null;
  geolocBannerShown: boolean;
}): boolean {
  if (opts.hasPosition) return false;
  if (opts.nudgeKind === 'position') return false;
  return !opts.geolocBannerShown;
}

/** Lecture `localStorage` tolérante : navigation privée, stockage bloqué ⇒ null. */
export function readStoredDate(key: string): Date | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export function writeStoredDate(key: string, date = new Date()): void {
  try {
    window.localStorage.setItem(key, date.toISOString());
  } catch {
    // best-effort : sans stockage, on redemandera — jamais l'inverse
  }
}

/** La carte de relance est-elle écartée (moins de 7 jours) sur cet appareil ? */
export function isNudgeDismissed(now = new Date()): boolean {
  const at = readStoredDate(NUDGE_DISMISS_KEY);
  if (!at) return false;
  return now.getTime() - at.getTime() < NUDGE_DISMISS_DAYS * 86_400_000;
}
