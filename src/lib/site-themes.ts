/**
 * Registre des skins (identités graphiques). Cf. DESIGN.md § Theming — Mode × Skin.
 *
 * Les *valeurs* de chaque skin vivent en CSS (blocs `html[data-theme="…"]`
 * clair + `html[data-theme="…"].dark` sombre, dans `globals.css`) — pas ici.
 * Ce module ne porte que l'identité (id, label, description) : ce qui est
 * nécessaire pour lister, valider et sélectionner un skin.
 *
 * Le skin par défaut « libre » vit dans `:root` / `:root.dark`.
 */
export interface SiteTheme {
  id: string;
  label: string;
  description: string;
}

export const DEFAULT_SITE_THEME_ID = 'libre';

export const SITE_THEMES: SiteTheme[] = [
  {
    id: 'libre',
    label: 'Libre (coral)',
    description: "L'identité coral/cream, chaude et lumineuse. Le thème par défaut.",
  },
  {
    id: 'libre-warm',
    label: 'Warm (terracotta)',
    description:
      'Variante plus chaude : davantage de terracotta, un crème plus profond. Décliné en clair et sombre.',
  },
  {
    id: 'cartoon',
    label: 'Cartoon',
    description:
      'Rondeurs généreuses, titres Baloo, chaleur plum-black en sombre. Ludique et doux.',
  },
  {
    id: 'arcade',
    label: 'Arcade',
    description:
      'Néon sur bleu-noir, glow coral, boutons biseautés. Énergie rétro-gaming.',
  },
  {
    id: 'retro',
    label: 'Rétro 8-bit',
    description:
      'Pixel-art assumé : arrondis nets, ombres dures, accents Press Start. Nostalgie 8-bit.',
  },
];

/**
 * Anciennes valeurs persistées (`site_config.currentTheme`, cookies de preview)
 * → nouveaux ids. Évite de casser les configs existantes après le renommage
 * `default` → `libre`, `c-warm` → `libre-warm`.
 */
const THEME_ALIASES: Record<string, string> = {
  default: 'libre',
  'c-warm': 'libre-warm',
};

export function getSiteTheme(id: string): SiteTheme | undefined {
  const canonical = THEME_ALIASES[id] ?? id;
  return SITE_THEMES.find((t) => t.id === canonical);
}

export function isValidSiteTheme(value: unknown): value is string {
  return typeof value === 'string' && getSiteTheme(value) !== undefined;
}
