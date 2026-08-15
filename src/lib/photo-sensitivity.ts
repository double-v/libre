/**
 * Sensibilité des photos et consentement du regard (#330).
 *
 * Une photo peut être classée *suggestive* ou *explicite* — par la modération
 * ou par son propriétaire. Chaque lecteur porte un **seuil** : jusqu'où il
 * accepte de voir sans rien avoir à cliquer.
 *
 * Toute la garantie tient dans `canSeeOriginal` : elle est pure et testée en
 * premier, parce que c'est elle qui décide si l'octet original quitte le
 * serveur. Le flou est produit côté serveur (dérivé stocké dans R2) et jamais
 * en CSS — un filtre CSS laisserait l'original arriver dans le navigateur,
 * donc lisible dans l'onglet réseau, ce qui ferait de la garantie un décor
 * (cf. #328, et le principe III de la constitution).
 */

/** Niveaux de classification, du plus doux au plus fort. */
export const SENSITIVITY_LEVELS = ['suggestive', 'explicit'] as const;

export type SensitivityLevel = (typeof SENSITIVITY_LEVELS)[number];

/**
 * Seuil du lecteur : jusqu'à quel niveau il accepte de voir en clair.
 * `none` = rien sans geste explicite, et c'est le défaut.
 */
export const SENSITIVITY_THRESHOLDS = ['none', 'suggestive', 'explicit'] as const;

export type SensitivityThreshold = (typeof SENSITIVITY_THRESHOLDS)[number];

export const DEFAULT_SENSITIVITY_THRESHOLD: SensitivityThreshold = 'none';

/** Rang d'un niveau. Une valeur inconnue prend le rang le plus élevé pour une
 *  photo (on la traite comme le pire cas) — voir `levelRank`. */
const LEVEL_RANK: Record<SensitivityLevel, number> = {
  suggestive: 1,
  explicit: 2,
};

const THRESHOLD_RANK: Record<SensitivityThreshold, number> = {
  none: 0,
  suggestive: 1,
  explicit: 2,
};

export function isSensitivityLevel(value: unknown): value is SensitivityLevel {
  return typeof value === 'string' && (SENSITIVITY_LEVELS as readonly string[]).includes(value);
}

export function isSensitivityThreshold(value: unknown): value is SensitivityThreshold {
  return typeof value === 'string' && (SENSITIVITY_THRESHOLDS as readonly string[]).includes(value);
}

/**
 * Rang d'un niveau de photo. Une valeur inattendue est traitée comme le niveau
 * le plus fort : sur un champ de ce genre, l'inconnu doit fermer, jamais ouvrir.
 */
function levelRank(level: string): number {
  return isSensitivityLevel(level) ? LEVEL_RANK[level] : LEVEL_RANK.explicit;
}

/**
 * Rang d'un seuil de lecteur. Une valeur inattendue retombe sur le défaut le
 * plus prudent (`none`) — même raison, dans l'autre sens.
 */
function thresholdRank(threshold: string | null | undefined): number {
  return isSensitivityThreshold(threshold) ? THRESHOLD_RANK[threshold] : THRESHOLD_RANK.none;
}

export interface SeeOriginalInput {
  /** Niveau de la photo, ou `null` si elle n'est pas classée. */
  level: string | null | undefined;
  /** Seuil du lecteur (`Profile.photoSensitivityOptIn`). */
  viewerThreshold: string | null | undefined;
  /** Le lecteur est le propriétaire de la photo. */
  isOwner: boolean;
  /** Le lecteur est administrateur (accès déjà journalisé en amont). */
  isAdmin: boolean;
  /** Le lecteur a cliqué « Voir » : consentement ponctuel, sans mémoire. */
  reveal: boolean;
}

/**
 * L'original peut-il être servi à ce lecteur ?
 *
 * `reveal` n'est pas un contournement : puisque « Voir » fonctionne toujours,
 * même pour un compte dont le seuil dit non (décision produit du 2026-08-15),
 * ce drapeau **est** le geste de consentement. La propriété qui compte reste
 * vraie : sans action explicite, l'original ne part jamais.
 */
export function canSeeOriginal(input: SeeOriginalInput): boolean {
  // Photo non classée : rien ne change par rapport à avant la feature.
  if (!input.level) return true;
  // Ses propres photos restent nettes, et l'admin doit pouvoir modérer ce
  // qu'il ne peut pas voir autrement.
  if (input.isOwner || input.isAdmin) return true;
  if (input.reveal) return true;
  return levelRank(input.level) <= thresholdRank(input.viewerThreshold);
}

/** Clé R2 du dérivé flouté, dérivée de celle de l'original. */
export function blurredKeyFor(key: string): string {
  const dot = key.lastIndexOf('.');
  return dot === -1 ? `${key}.blur` : `${key.slice(0, dot)}.blur${key.slice(dot)}`;
}

/** Libellés d'interface — français, descriptifs, sans jugement sur qui publie. */
export const SENSITIVITY_LABELS: Record<SensitivityLevel, string> = {
  suggestive: 'Suggestive',
  explicit: 'Explicite',
};

export const THRESHOLD_LABELS: Record<SensitivityThreshold, string> = {
  none: 'Aucune photo sensible',
  suggestive: 'Les photos suggestives',
  explicit: 'Toutes les photos',
};
