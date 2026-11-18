/**
 * Textes des gestes de #436, pour les demandes envoyées avant le code
 * manuscrit (spec 012, FR-008) : elles restent traitables jusqu'à
 * épuisement, et la modération doit lire le geste qui avait été demandé.
 * Plus aucun geste n'est tiré.
 */
const TEXTES: Record<string, string> = {
  'main-ouverte': 'Main ouverte, paume vers l’objectif, à côté de ton visage',
  'deux-doigts': 'Deux doigts levés, à côté de ta joue',
  pouce: 'Pouce levé, sous ton menton',
  'main-tete': 'Main posée sur le haut de ta tête',
  'tete-gauche': 'Tête légèrement tournée vers ta gauche',
  'oeil-ferme': 'Un œil fermé, l’autre ouvert',
  'regard-haut': 'Regard vers le haut, tête droite',
  'bouche-o': 'Bouche ouverte en « o »',
};

export function texteAncienGeste(code: string | null | undefined): string | null {
  return code ? TEXTES[code] ?? null : null;
}
