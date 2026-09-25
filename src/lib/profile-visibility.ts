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

/**
 * Réciprocité miroir sur l'intention (spec 008) : « tu vois ce que tu
 * montres ». Une lectrice qui n'a pas dit ce qu'elle cherche ne lit pas ce que
 * cherchent les autres.
 *
 * Une seule décision, appelée par chaque route qui sérialise l'intention
 * d'autrui : deux logiques parallèles finissent par diverger (leçon du voile
 * photo, #330), et une promesse d'UI non adossée à chaque route est un défaut
 * de sécurité (#328).
 */

/**
 * La lectrice a-t-elle dit ce qu'elle cherche ? Toute valeur compte, y compris
 * « je verrai en chemin » : on ne force aucune étiquette. Lectrice inconnue
 * (profil introuvable, lecture en échec) → non : l'échec ferme.
 */
export function hasDeclaredIntention(list: readonly string[] | null | undefined): boolean {
  return Array.isArray(list) && list.length > 0;
}

export type IntentionField =
  | { relationshipType: string[] }
  | { relationshipTypeVeiled: true };

/**
 * Ce qui sort dans la réponse pour l'intention d'une personne lue.
 *
 * Voilé = clé `relationshipType` **absente** et marqueur explicite, pour que
 * l'interface distingue « voilé pour toi » de « rien de renseigné » et n'invite
 * à déclarer que s'il y a quelque chose à dévoiler. Le marqueur ne dit que
 * « cette personne a répondu », sans la réponse.
 */
export function intentionFor(opts: {
  isSelf: boolean;
  viewerIntention: readonly string[] | null | undefined;
  relationshipType: readonly string[] | null | undefined;
}): IntentionField {
  const value = [...(opts.relationshipType ?? [])];
  if (opts.isSelf || value.length === 0 || hasDeclaredIntention(opts.viewerIntention)) {
    return { relationshipType: value };
  }
  return { relationshipTypeVeiled: true };
}
