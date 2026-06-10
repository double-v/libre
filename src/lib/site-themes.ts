export interface SiteTheme {
  id: string;
  label: string;
  description: string;
  tokenOverrides: Record<string, string>;
}

export const SITE_THEMES: SiteTheme[] = [
  {
    id: 'default',
    label: 'Default (coral actuel)',
    description: 'Identité visuelle existante — palette coral/terracotta/blush.',
    tokenOverrides: {
      '--color-coral': '#E8634A',
      '--color-coral-light': '#F09A88',
      '--color-terracotta': '#C4503A',
      '--color-blush': '#FDF0ED',
      '--color-sand': '#F5E6D8',
      '--color-coral-dark': '#9E3A28',
      '--background': '#ffffff',
      '--foreground': '#171717',
    },
  },
  {
    id: 'c-warm',
    label: 'C-Warm (variante chaude)',
    description: 'Palette plus chaude, plus de terracotta, fond crème. Pour tester une direction "accueillante".',
    tokenOverrides: {
      '--color-coral': '#D9542E',
      '--color-coral-light': '#E68B6E',
      '--color-terracotta': '#A33A20',
      '--color-blush': '#FBE8DD',
      '--color-sand': '#EFD8C2',
      '--color-coral-dark': '#7A2A18',
      '--background': '#FFFBF7',
      '--foreground': '#1F1410',
    },
  },
];

export function getSiteTheme(id: string): SiteTheme | undefined {
  return SITE_THEMES.find((t) => t.id === id);
}

export function isValidSiteTheme(value: unknown): value is string {
  return typeof value === 'string' && SITE_THEMES.some((t) => t.id === value);
}
