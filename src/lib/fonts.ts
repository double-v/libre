import { Space_Grotesk, Baloo_2, Press_Start_2P } from 'next/font/google';

/**
 * Polices de thème (Baloo 2, Space Grotesk, Press Start 2P), chargées via
 * `next/font/google` donc **self-hostées** au build : aucune requête runtime vers
 * Google Fonts (CSP + perf + vie privée — cf. DESIGN.md § Theming, et AGENTS.md).
 *
 * Depuis l'unification des thèmes (ex-lobby → thèmes app), ces vars sont posées au
 * **layout racine** (`<body>`) : `--head-font` de chaque thème y pioche (Baloo pour
 * cartoon, Space Grotesk pour arcade/retro). Chaque police n'expose que sa **CSS
 * var** (`variable`) — pas de `font-family` globale ; les woff2 ne sont téléchargés
 * que si un glyphe utilise réellement la famille (thème actif). Mapping var → rôle
 * dans `globals.css` (`--head-font`).
 *
 * Garde-fou : Press Start 2P est réservé aux titres/accents du thème `retro`
 * (jamais le corps de texte) — appliqué côté tokens, pas ici.
 */

// Space Grotesk & Baloo 2 sont des polices variables : on omet `weight` pour
// charger l'axe complet et piloter la graisse en CSS (--lobby-font-head, etc.).
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
});

const baloo = Baloo_2({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-baloo',
});

// Press Start 2P n'est pas variable : graisse unique 400 requise.
const pressStart = Press_Start_2P({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-press-start',
});

/**
 * Classe à poser sur le `<body>` racine : déclare les trois `--font-*` de thème
 * sans imposer de police au reste du site (chaque thème choisit via `--head-font`).
 */
export const themeFontVars = `${spaceGrotesk.variable} ${baloo.variable} ${pressStart.variable}`;

/** @deprecated Alias historique (scope landing) — préférer `themeFontVars`. */
export const lobbyFontVars = themeFontVars;
