/**
 * Visibilité des champs sensibles du profil (#328).
 *
 * `/profil` affichait « Ces préférences sont privées. Elles ne s'affichent que
 * pour vos matches, pas publiquement » au-dessus des pratiques — alors que le
 * champ partait tel quel dans `/api/discover` et `/api/users/[id]`, sans le
 * moindre contrôle de match. Des gens ont rempli ce champ en lisant cette
 * phrase ; la règle vit désormais ici, et les routes la consultent.
 */

export const PRACTICES_VISIBILITY_VALUES = ['matches', 'public'] as const;

export type PracticesVisibility = (typeof PRACTICES_VISIBILITY_VALUES)[number];

/**
 * Défaut volontairement restrictif, y compris pour les profils déjà remplis :
 * la promesse affichée jusqu'ici disait « réservé aux matches », c'est elle
 * qu'on honore. Basculer tout le monde en « public » pour préserver le
 * comportement du code aurait trahi ces personnes une seconde fois.
 */
export const DEFAULT_PRACTICES_VISIBILITY: PracticesVisibility = 'matches';

/**
 * Ce lecteur a-t-il le droit de voir les pratiques de ce profil ?
 *
 * Toute valeur inconnue (colonne vide, donnée héritée, écriture directe en
 * base) retombe sur « réservé aux matches » : sur un champ sensible, l'échec
 * doit fermer, jamais ouvrir.
 */
export function canSeePractices(opts: {
  visibility: string | null | undefined;
  isSelf: boolean;
  isMatched: boolean;
}): boolean {
  if (opts.isSelf) return true;
  return opts.visibility === 'public' || opts.isMatched;
}
