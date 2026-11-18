/**
 * Motifs de refus d'un selfie de vérification (spec 012, FR-007).
 *
 * Une liste fermée plutôt qu'un texte libre : le membre lit ce motif, et une
 * saisie libre de modérateur n'a pas à lui parvenir telle quelle. Chaque
 * motif porte un conseil : un refus doit toujours dire comment réussir la
 * fois suivante (US2, aucune impasse).
 */
export interface Motif {
  /** Ce que lit le membre. */
  texte: string;
  /** Comment réussir la prochaine fois, lu par le membre. */
  conseil: string;
  /** Libellé court du choix, côté modération. */
  libelle: string;
}

export const MOTIFS_REFUS = {
  code: {
    texte: 'Le code n’est pas écrit à la main, pas lisible ou pas exact.',
    conseil: 'Écris les chiffres en gros, au feutre si tu en as un, et vérifie qu’on les lit bien avant d’envoyer.',
    libelle: 'Code absent, illisible ou faux',
  },
  personne: {
    texte: 'Le selfie ne correspond pas aux photos de ton profil.',
    conseil: 'Vérifie que les photos de ton profil te montrent bien, puis reprends un selfie de face, sans filtre.',
    libelle: 'Pas la même personne',
  },
  ecran: {
    texte: 'La photo semble prise sur un écran, retouchée ou générée.',
    conseil: 'Prends la photo maintenant avec l’appareil de ton téléphone, sans filtre ni retouche.',
    libelle: 'Écran, retouche ou image générée',
  },
  visage: {
    texte: 'Ton visage n’est pas assez visible.',
    conseil: 'Mets-toi face à la lumière, sans lunettes de soleil, le visage en entier dans le cadre.',
    libelle: 'Visage peu visible',
  },
} as const satisfies Record<string, Motif>;

export type MotifRefus = keyof typeof MOTIFS_REFUS;

/** Les seuls motifs qu'un modérateur peut choisir aujourd'hui. */
export const CODES_MOTIFS = Object.keys(MOTIFS_REFUS) as [MotifRefus, ...MotifRefus[]];

/**
 * Clés écrites avant la spec 012 (#436), encore présentes dans l'historique.
 * Elles se lisent avec le motif d'aujourd'hui le plus proche ; on ne peut
 * plus les choisir.
 */
const ANCIENNES: Record<string, MotifRefus> = {
  geste_invisible: 'code',
  ne_correspond_pas: 'personne',
  photo_ecran: 'ecran',
  visage_peu_visible: 'visage',
};

/** Motif lisible d'une clé stockée, actuelle ou ancienne ; `null` si inconnue. */
export function lireMotif(cle: string | null | undefined): (Motif & { cle: string }) | null {
  if (!cle) return null;
  if (cle === 'geste_invisible') {
    // Le geste n'existe plus, mais le membre refusé à l'époque doit lire ce
    // qui lui est arrivé, pas un motif sur un code qu'il n'a jamais eu.
    return { cle, texte: 'Le geste demandé ne se voit pas sur la photo.', conseil: MOTIFS_REFUS.code.conseil, libelle: 'Geste non visible (ancien)' };
  }
  const actuelle = (cle in MOTIFS_REFUS ? cle : ANCIENNES[cle]) as MotifRefus | undefined;
  return actuelle ? { cle: actuelle, ...MOTIFS_REFUS[actuelle] } : null;
}
