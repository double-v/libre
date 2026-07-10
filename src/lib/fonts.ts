import { Space_Grotesk, Baloo_2, Press_Start_2P } from 'next/font/google';

/**
 * Polices de la landing « lobby » (épic #243), chargées via `next/font/google`
 * donc **self-hostées** au build : aucune requête runtime vers Google Fonts (CSP
 * + perf + vie privée — cf. DESIGN.md § Theming, Axe 3, et AGENTS.md).
 *
 * Chaque police n'expose que sa **CSS var** (`variable`) — elle ne pose pas de
 * `font-family` globale. Les woff2 ne sont téléchargés par le navigateur que
 * lorsqu'un glyphe utilise réellement la famille : hors landing, rien n'est
 * chargé. Le mapping var → rôle de thème vit dans `globals.css` (`--lobby-font-*`).
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
 * Classe à poser sur le **conteneur racine du lobby** (scope landing) : elle
 * déclare les trois `--font-*` sans imposer de police au reste du site.
 */
export const lobbyFontVars = `${spaceGrotesk.variable} ${baloo.variable} ${pressStart.variable}`;
