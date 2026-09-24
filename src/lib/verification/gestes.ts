/**
 * Gestes du selfie de vérification (#436).
 *
 * Le serveur tire le geste : une photo déjà publiée, ou trouvée ailleurs, ne
 * le montre pas. La moitié se fait sans les mains — une personne qui ne peut
 * pas lever la main doit pouvoir obtenir le badge comme les autres, et le
 * second tirage lui en laisse la chance.
 */
export interface Geste {
  code: string;
  /** Consigne telle que lue par le membre et par la modération. */
  texte: string;
  /** Choisit le pictogramme. */
  type: 'main' | 'visage';
}

export const GESTES: readonly Geste[] = [
  { code: 'main-ouverte', texte: 'Main ouverte, paume vers l’objectif, à côté de ton visage', type: 'main' },
  { code: 'deux-doigts', texte: 'Deux doigts levés, à côté de ta joue', type: 'main' },
  { code: 'pouce', texte: 'Pouce levé, sous ton menton', type: 'main' },
  { code: 'main-tete', texte: 'Main posée sur le haut de ta tête', type: 'main' },
  { code: 'tete-gauche', texte: 'Tête légèrement tournée vers ta gauche', type: 'visage' },
  { code: 'oeil-ferme', texte: 'Un œil fermé, l’autre ouvert', type: 'visage' },
  { code: 'regard-haut', texte: 'Regard vers le haut, tête droite', type: 'visage' },
  { code: 'bouche-o', texte: 'Bouche ouverte en « o »', type: 'visage' },
];

export function geste(code: string): Geste | undefined {
  return GESTES.find((g) => g.code === code);
}

/** Tire un geste, jamais celui d'avant : un second tirage doit changer quelque chose. */
export function tirerGeste(precedent?: string, hasard: () => number = Math.random): Geste {
  const candidats = GESTES.filter((g) => g.code !== precedent);
  return candidats[Math.min(candidats.length - 1, Math.floor(hasard() * candidats.length))];
}
