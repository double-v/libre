/**
 * Motifs de refus d'un selfie de vérification (#436).
 *
 * Une liste fermée plutôt qu'un texte libre : le membre lit ce motif, et une
 * saisie libre de modérateur n'a pas à lui parvenir telle quelle.
 */
export const MOTIFS_REFUS = {
  geste_invisible: 'Le geste demandé ne se voit pas sur la photo.',
  visage_peu_visible: 'Ton visage n’est pas assez visible.',
  ne_correspond_pas: 'Le selfie ne correspond pas aux photos de ton profil.',
  photo_ecran: 'La photo semble prise sur un écran ou une autre photo.',
} as const;

export type MotifRefus = keyof typeof MOTIFS_REFUS;

export const CODES_MOTIFS = Object.keys(MOTIFS_REFUS) as [MotifRefus, ...MotifRefus[]];
