---
version: 1.0
name: Libre Design System
description: A warm, inclusive dating app built on coral and cream — deliberately human, never corporate. Freedom-first: no paywalls, no data resale, no algorithmic manipulation.
---

# DESIGN.md — Libre

> Ce fichier documente les valeurs et l'intention. La source de vérité exécutable pour les tokens Tailwind (couleurs, ombres, motion) est le bloc `@theme` de `src/app/globals.css` — tout token référencé par un composant doit y être déclaré (`--color-<nom>`, `--shadow-<nom>`, `--ease-<nom>`, `--motion-<nom>`) avec la valeur ci-dessous.

## Colors

### Brand & Accent

| Token | Hex | Use |
|---|---|---|
| coral | `#E8634A` | Primary CTA, brand accent, logo, active states |
| coral-light | `#F09A88` | Hover/tinted variants, soft accents |
| terracotta | `#C4503A` | Hover/pressed primary, strong emphasis |
| coral-dark | `#9E3A28` | Focus rings, deepest accent |

Coral is Libre's voltage. It signals warmth, approachability, and the human side of meeting someone. It deliberately avoids the cool blue/slate of corporate dating apps. Use it generously on CTAs and brand moments; sparingly on decorative elements.

### Secondary Warm (gamification + accents)

| Token | Hex | Use |
|---|---|---|
| abricot | `#F4B58A` | Têtes de section chaudes, célébrations subtiles, illustrations d'onboarding |
| miel | `#E8A04E` | Badges d'accomplissement discrets, accents chaleureux dans le chat |
| terracotta-deep | `#8A2A1B` | Texte accentué sur fond clair (alternative à coral-dark pour variation visuelle) |
| rose-poudré | `#F7D4CB` | Background alternatif à blush, états hover doux sur cartes |

Ces couleurs sont **secondaires** : on ne les utilise jamais comme CTA principal. Elles portent la profondeur visuelle, les nuances, et les moments gamifiés discrets. Abricot et miel sont les couleurs d'accomplissement (badges "Cœur ouvert", streaks discrets). Rose-poudré est un fond alternatif pour briser la monotonie du cream.

### Surface

| Token | Hex | Use |
|---|---|---|
| white | `#FFFFFF` | Default page floor, card backgrounds |
| blush | `#FDF0ED` | Soft section backgrounds, warm dividers |
| sand | `#F5E6D8` | Elevated card surfaces, warm cream |

Blush is Libre's answer to the "warm canvas" — tinted, never pure clinical white. Sand is one step deeper for card elevation.

### Text

| Token | Hex | Tailwind | Contrast on white | Use |
|---|---|---|---|---|
| ink | `#171717` | `text-gray-900` | 17.4:1 | Input value text, page titles |
| label | `#1f2937` | `text-gray-800` | 13.5:1 | Form labels (strong, but distinct from input text) |
| body | `#374151` | `text-gray-700` | 8.3:1 | Running text, small labels, descriptions |
| secondary | `#4b5563` | `text-gray-600` | 7.5:1 | Subtitles, section headers (uppercase), muted text |
| placeholder | `#9ca3af` | `text-gray-400 italic` | 2.8:1 | **Placeholder only** — lighter than input text by design |
| on-coral | `#FFFFFF` | `text-white` | — | Text on coral/terracotta backgrounds |
| on-dark | `#ededed` | `dark:text-gray-200` | — | Text on dark surfaces |

**Visual hierarchy on light backgrounds** (darkest → lightest):
1. **Input value** (`text-gray-900`) — what the user types, MOST visible
2. **Form labels** (`text-gray-800`) — "Pseudo", "Email", always visible
3. **Body text** (`text-gray-700`) — descriptions, bio, running text
4. **Secondary text** (`text-gray-600`) — subtitles, uppercase section headers, timestamps
5. **Placeholders** (`text-gray-400 italic`) — hints, examples, LEAST visible

**Placeholder rule**: Placeholders MUST be lighter than input value text so users can distinguish hint from typed data. Use `font-style: italic` for additional visual distinction. Placeholders are supplementary — every input has a visible `<label>`.

### Semantic

| Token | Hex | Use |
|---|---|---|
| success | `#16a34a` | Online indicator, verified badge, positive states |
| warning | `#d4a017` | Beta banner, caution states |
| error | `#dc2626` | Validation errors, destructive actions |

### Dark Mode

| Token | Hex | Use |
|---|---|---|
| dark-bg | `#0a0a0a` | Page floor |
| dark-surface | `#171717` | Card backgrounds |
| dark-elevated | `#1f2937` | Elevated surfaces |
| dark-border | `#374151` | Borders on dark surfaces |

## Theming — Mode × Skin

Le theming a **deux axes orthogonaux**. Ne jamais les confondre : le **mode** est perceptuel (confort / accessibilité, suit l'OS) ; le **skin** est une identité graphique (goût). Le choix de skin est aussi un **signal doux** de préférence utilisateur — jamais affiché comme une récompense, jamais gamifié (cf. PRODUCT.md, principe 4).

### Axe 1 — Mode (`light` / `dark` / `auto`)

- Porté par la classe `.dark` sur `<html>` (déjà en place : script no-flash dans `layout.tsx` + `ThemeToggle`).
- `auto` (défaut) suit `prefers-color-scheme`. Persisté : `localStorage['libre-theme']` = `light | dark | auto`.
- **Tout skin doit exister en light ET en dark.** Le mode ne dépend jamais du skin.
- « blanc » n'est pas un thème à part : le light par défaut EST blanc/blush. Light/dark = mode, pas skin.

### Axe 2 — Skin (identité graphique)

- Porté par `data-theme="<id>"` sur `<html>` (déjà en place via `site-themes.ts` + `useSiteThemeApply`).
- Devient **sélectionnable par l'utilisateur**, rangé dans les Paramètres à côté du mode.
- Défaut : `libre` (coral/cream actuel).

**Précédence du skin** (à implémenter) :
1. Choix explicite user — `localStorage['libre-skin']` (+ `User.skin` pour les comptes, synchronisé).
2. Défaut du site — `SiteConfig.currentTheme` (piloté admin).
3. `libre`.

> **Décisions arrêtées :**
> - **Admin = défaut, user = souverain.** `SiteConfig.currentTheme` fixe le skin *par défaut* ; le choix explicite de l'utilisateur le remplace toujours. Pas de skin forcé par l'admin.
> - **« La Place » reste hors de cet axe.** Les thèmes événementiels de section (`square_theme_configs`, planifiés / admin) demeurent un système séparé — mais **ancrés sur les mêmes tokens sémantiques** du layout global (ils surchargent des accents de section, jamais un système parallèle qui les combat).
> - **Séquencement** : d'abord **solidifier le socle** (#223 tokens sémantiques + #224 sélecteur, en rationalisant `libre` / `libre-warm`), **ensuite** les skins « waouh » (Cartoon, Pixel — chacun light **et** dark).

### Contrat de tokens sémantiques (le cœur de la rationalisation)

Aujourd'hui les composants codent le mode **en dur** (`bg-white dark:bg-dark-surface`, `text-gray-900 dark:text-gray-100`). Conséquence : un skin ne peut retheme que les accents, pas les surfaces. On introduit une couche **sémantique** que chaque `skin × mode` redéfinit et que les composants consomment :

| Token | Rôle | Remplace le binaire |
|---|---|---|
| `--bg` | plancher de page | `bg-white dark:bg-gray-950` |
| `--surface` | carte / panel | `bg-white dark:bg-dark-surface` |
| `--surface-elevated` | surface surélevée | `dark:bg-dark-elevated` |
| `--surface-sunken` | fond de section chaud | `bg-blush dark:bg-coral/10` |
| `--text` | texte principal | `text-gray-900 dark:text-gray-100` |
| `--text-dim` | texte secondaire | `text-gray-600 dark:text-gray-400` |
| `--border` | filet | `border-gray-200 dark:border-dark-border` |
| `--accent`, `--accent-strong`, `--accent-ink` | coral & dérivés | `text-coral`, `bg-coral`, `bg-terracotta` |
| `--radius-card`, `--radius-control` | arrondis (**varient par skin**) | `rounded-xl`, `rounded-md` |
| `--font-head` | police des titres (**varie par skin**) | Geist |

Règle : **un skin = un delta.** Il ne redéfinit que ce qui diffère de la base ; le reste hérite. « light + dark par skin » ≈ deux petits blocs de variables, pas deux designs complets. Les composants **n'utilisent plus jamais** `bg-white dark:…` en dur : ils lisent ces tokens (utilitaires Tailwind mappés dessus). C'est la même trajectoire que la « Component Library » ci-dessous.

**Données** : `SiteTheme.tokenOverrides: Record<string,string>` (plat) devient `{ light: Record<string,string>; dark: Record<string,string> }` (mode-aware). Le hook et le SSR appliquent le bloc correspondant au mode courant. Le script no-flash de `layout.tsx` doit poser **avant paint** la classe `.dark` (mode) **et** `data-theme` + les vars du skin lues en `localStorage` (sinon flash de skin).

### Catalogue

**Au lancement** (rationalisation de l'existant, refait mode-aware + sémantique) :

| Skin | Ex- | Note |
|---|---|---|
| `libre` | `default` | Base coral/cream. Light + dark chaud. |
| `libre-warm` | `c-warm` | Variante plus chaude / terracotta. |

**Vagues suivantes** (issues GH), chacun **light + dark** :

| Skin | Direction | Contraintes spécifiques |
|---|---|---|
| `cartoon` | Baloo 2, grands radius, plum-black chaud en dark | garder la chaleur, pas de froid bleuté |
| `pixel` | Rétro : titres nets, scanlines discrètes | **Press Start 2P en titres/accents SEULEMENT**, jamais le corps ; scanlines coupées sous `prefers-reduced-motion` |

### Garde-fous (obligatoires, tout skin × mode)

- **Contraste WCAG AA** vérifié sur light ET dark (4.5:1 texte, 3:1 grands titres).
- `color-scheme: light|dark` déclaré par mode (contrôles natifs, scrollbars, autofill).
- **Polices display** (pixel, etc.) : titres / accents uniquement — jamais le corps de texte.
- Toute animation de skin a son équivalent `prefers-reduced-motion`.
- Le skin change l'**habillage**, jamais la **sémantique** : un CTA reste « accent » via `--accent`, une erreur reste `--error`.
- Zéro valeur inline dans les composants — tout via tokens.

### Axe 3 — Thèmes « lobby » (landing publique uniquement)

La home publique (`src/app/page.tsx`, épic #243) adopte une ambiance **« lobby »
pop-culture** : sombre mais chaude, personnages qui marchent, skyline parallax,
ciel jour/nuit. Elle porte **son propre axe de thème**, **distinct des skins app** :

- **Portée** : la landing marketing seulement. **N'a aucun lien** avec l'axe Mode
  (`.dark`) ni l'axe Skin (`data-theme` = `libre`/`libre-warm`) : un thème lobby ne
  touche ni `localStorage['libre-theme']` ni `localStorage['libre-skin']`.
- **Porteur** : attribut `data-lobby="<id>"` **sur le conteneur racine du lobby**
  (pas sur `<html>`). Persistance : `localStorage['libre-lobby-theme']`. Défaut :
  `cartoon`. **No-flash** : script inline (même patron que `layout.tsx`) posant
  `data-lobby` avant paint.
- **Toujours sombre** : ces thèmes n'ont pas de variante claire (au contraire des
  skins app). Le fond reste sombre-chaud, jamais froid bleuté (cf. PRODUCT.md, anti-réf).

**3 thèmes** (commutables via un switcher landing, cf. `LobbyThemeSwitcher`) :

| `data-lobby` | Direction | Police titres | Radius | Silhouette bouton |
|---|---|---|---|---|
| `cartoon` (défaut) | Plum-black chaud, rondeurs généreuses | Baloo 2 | 30/20px | pleine (no clip) |
| `arcade` | Bleu-noir néon, glow coral | Space Grotesk | 20/12px | coin biseauté |
| `retro` | 8-bit, ombres dures, scanlines | Space Grotesk + Press Start 2P | 4/2px | pixel-clip |

**Tokens `--lobby-*`** (déclarés en blocs `[data-lobby="…"]` dans `globals.css`, à
côté des skins — **jamais d'hex inline dans le TSX**) :

| Token | Rôle |
|---|---|
| `--lobby-bg`, `--lobby-bg-elev` | plancher / surface surélevée |
| `--lobby-text`, `--lobby-text-dim` | texte principal / secondaire |
| `--lobby-accent`, `--lobby-accent-strong`, `--lobby-gold` | coral, coral clair, or |
| `--lobby-radius-lg`, `--lobby-radius-sm` | arrondis (varient par thème) |
| `--lobby-font-head`, `--lobby-font-eyebrow` | police titres / eyebrow (varient par thème) |
| `--lobby-btn-clip` | `clip-path` du bouton (biseau arcade / pixel retro / none cartoon) |
| `--lobby-card-border`, `--lobby-chip-border` | filets cartes / chips |
| `--lobby-shadow`, `--lobby-cta-shadow` | ombre panneau / CTA (glow doux, ou ombre dure 8-bit en retro) |
| `--lobby-panel-bg`, `--lobby-bg-texture` | dégradé de panneau / texture de fond (scanlines retro) |

**Polices** (via `next/font/google`, self-host — **jamais** de `<link>` Google/CDN,
cf. CSP + perf) : `Space Grotesk` (500/700), `Baloo 2` (600/700), `Press Start 2P`
(400). Garde-fou : **Press Start 2P en titres/accents du thème `retro` uniquement**,
jamais le corps de texte (lisibilité) — le prototype l'utilisait pour l'eyebrow de
tous les thèmes, on le **restreint** au retro (`--lobby-font-eyebrow` par thème).

**Garde-fous** (comme tout thème) : **reduced-motion** obligatoire sur chaque
animation (pulse des blobs, mot rotatif, personnages/bulles, parallax skyline,
oiseaux, étoiles, scanlines) — settle statique ; **WCAG AA** sur les 3 thèmes ;
focus ring coral ; cibles ≥ 44px ; zéro hex inline.

**Footer landing** (`LobbyFooter`, #250) : la landing s'adresse à des visiteurs
**non connectés**, donc les liens légaux (CGU, confidentialité, mentions légales,
FAQ) + social + code source ouvert **vivent dans un footer** de la home — c'est
l'**exception** à la règle app shell « pas de footer légal, tout dans `/settings` »
(cf. § Layout & Safe-area), qui ne vaut que pour l'app connectée. Stylé `--lobby-*`,
landmarks `<nav aria-label>` + `<footer>`.

## Typography

### Font Stack

- **Sans**: Geist Sans (Next.js default), Inter fallback. `var(--font-geist-sans)`
- **Mono**: Geist Mono. `var(--font-geist-mono)`

No serif display face — Libre's voice is modern, approachable, never literary or corporate.

### Base

- **Font-size**: 18px desktop, 16px mobile — 16px is browser minimum, 18px is optimal for screen readability
- **Line-height**: 1.6 body, 1.2 headings — tight heads, generous body
- **Paragraph spacing**: 1.2em margin-bottom — breathing room between blocks
- **Uppercase labels**: `letter-spacing: 0.05em` — prevents letter merging at small caps
- **Max line length**: 60–75 characters (≈700px) — eye fatigue beyond that

Source: crea-troyes.fr typography methodology — "Le confort de lecture passe toujours avant l'esthétique."

### Scale

| Token | Size | Weight | Tailwind | Use |
|---|---|---|---|---|
| display | 48–64px | 700 | `text-5xl` / `text-6xl font-bold` | Hero "Libre" |
| h1 | 30px | 700 | `text-2xl font-bold` | Page titles |
| h2 | 24px | 700 | `text-xl font-bold` | Section titles |
| h3 | 20px | 600 | `text-lg font-semibold` | Card titles |
| body | 16px | 400 | `text-base` | Running text, form labels |
| body-sm | 14px | 400 | `text-sm` | Secondary text, descriptions |
| caption | 13px | 500 | `text-xs font-medium` | Labels, badges, meta |
| caption-uppercase | 12px | 500 | `text-xs font-medium uppercase tracking-wider` | Section labels |
| button | 14px | 500 | `text-sm font-medium` | All buttons |

### Principles

- Display size "Libre" uses coral color + bold weight. This is the ONLY use of display scale.
- Body text stays weight 400 (regular). Labels and buttons use 500 (medium).
- Never use weight below 400. Never use weight 800+. Range: 400–700.
- Line-height: 1.4 for titles, 1.55 for body text.

## Layout

### Spacing

Base unit: 4px.

| Token | Value | Use |
|---|---|---|
| xxs | 4px | Tight gaps |
| xs | 8px | Icon gaps, inline spacing |
| sm | 12px | Card internal gaps |
| md | 16px | Standard padding |
| lg | 24px | Section padding (mobile) |
| xl | 32px | Card padding |
| xxl | 48px | Section padding (desktop) |
| section | 64–96px | Major section breaks |

### Grid

- Max content: `max-w-md` (448px) for auth forms
- Max content: `max-w-lg` (512px) for main app panels
- Max content: `max-w-2xl` (672px) for marketing pages
- Cards: `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`

### Container Patterns

- **Auth pages**: Centered column, `max-w-md`, logo above
- **Main app**: Single panel with bottom tab nav, `max-w-lg`
- **Marketing**: Full-width bands alternating surfaces

## Shapes

### Border Radius

| Token | Value | Tailwind | Use |
|---|---|---|---|
| sm | 4px | `rounded-sm` | Subtle rounding |
| md | 6–8px | `rounded-md` | Buttons, inputs |
| lg | 12px | `rounded-lg` | Cards, panels |
| xl | 16px | `rounded-xl` | Feature cards |
| pill | 9999px | `rounded-full` | Avatars, tags, badges, CTAs |

### Avatars

- Default: `h-12 w-12 rounded-full` (48px)
- Profile modal: `h-24 w-24 rounded-full` (96px)
- Placeholder: `bg-gray-200` with initials in `text-gray-600`
- Online dot: 10px green circle at bottom-right of avatar

## Components

### Navigation

- **Auth nav**: Centered Logo component (heart-sun icon + "Libre" text), links to `/`
- **Bottom tab bar**: 5 tabs (Discover, Croisements, Messages, Nearby, Profile), `bg-white border-t`, icons + labels, coral active state
- **Top header**: Page title `text-2xl font-bold`, optional action button right

### Buttons

| Component | Background | Text | Radius | Height | Use |
|---|---|---|---|---|---|
| button-primary | coral | white | md | 36–40px | Main CTAs (Se connecter, Créer mon compte) |
| button-primary-hover | terracotta | white | md | — | Hover/active |
| button-primary-focus | coral | white | md + 2px coral ring offset | — | Focus |
| button-primary-disabled | coral 50% opacity | white | md | — | Loading/disabled |
| button-secondary | white + border | gray-700 | pill | 36px | Secondary actions (Voir le profil, Annuler) |
| button-text | transparent | coral | — | — | Links ("Se connecter", "Créer un compte") |

### Cards

| Component | Background | Radius | Padding | Use |
|---|---|---|---|---|
| profile-card | white + border | xl | 16px | Browse/discover list items |
| crossing-card | white + border | xl | 16px | Croisements list |
| match-card | white + border | xl | 16px | Matches list |
| modal | white | lg | 24px | Profile modal, match dialog |
| filter-panel | white + border | xl | 16px | Discover filters |

### Form Elements

| Component | Background | Border | Radius | Height | Use |
|---|---|---|---|---|---|
| text-input | white | 1px gray-300 | md | 40px | `text-gray-900` value, `text-gray-400 italic` placeholder |
| text-input-focus | white | 2px coral | md + ring | 40px | Focused |
| text-area | white | 1px gray-300 | md | auto | Bio, feedback |
| select | white | 1px gray-300 | md | 36px | Gender, dropdowns |

### Tags & Badges

| Component | Background | Text | Radius | Use |
|---|---|---|---|---|
| tag-chip | gray-100 / dark:gray-800 | gray-700 / dark:gray-300 | pill | Interests, orientation, practices |
| tag-chip-selected | coral | white | pill | Active filter tags |
| badge-verified | blue-100 | blue-800 | pill | Verified user indicator |
| badge-online | green-500 bg | white text | pill | "En ligne" indicator |
| badge-beta | warning bg | ink | pill | Beta banner |

### Status Indicators

| Component | Style | Use |
|---|---|---|
| online-dot | 10px circle, `bg-green-500`, positioned bottom-right of avatar | User is online |
| last-seen | `text-gray-600 text-sm`, French relative time | "Vu il y a 3 min" |
| loading | `text-gray-600`, "Chargement..." | Data fetching |

### Messages système du chat

Certains messages ne sont pas du texte utilisateur mais un **événement** dans le
fil (proposition d'échange de réseaux, plus tard : check-in partagé…). Ils ne
prennent pas la forme d'une bulle gauche/droite mais d'un **badge centré**,
discret et chaleureux — univers coral, jamais de gris brut.

| Component | Style | Use |
|---|---|---|
| `ShareContactNotice` (`src/components/`) | pill centrée `bg-blush text-coral-dark` (dark : `bg-coral/10 text-coral-light`), icône lien, copie FR selon émetteur/destinataire | Proposition d'échange de réseaux dans le chat (remplace l'ancien affichage JSON brut) |

## Logo

### Heart-Sun (Cœur-soleil)

The logo is a heart shape with sun rays emanating from the top. Concept: love (heart) meets freedom/dawn (sun). Unique in the dating app landscape — no competitor uses a sun motif.

**Favicon**: Heart-sun in white on `#E8634A` rounded square background (96px radius, 512x512 viewBox).

**Inline component** (`<Logo />`): Heart-sun SVG icon (no background, `fill="currentColor"`) + "Libre" text in `text-2xl font-bold text-coral`. Links to `/`.

**SVG construction**: 5 rounded-rect rays rotated ±60°/±30°/0° around top center of heart, then heart path drawn on top (covering lower ray portions).

## Copy & Tone

### Voice

- French, always. No English UI text.
- Warm, direct, never corporate. "Tu" energy without being familiar.
- Inclusive by default: no assumptions about mobility, ability, or circumstances.
- Concise. Label > explanation.

### Inclusive Copy Rules

- NEVER say "sortez", "allez dehors", "bougez" — excludes people who can't leave home
- NEVER assume physical meeting ("on se voit") — use "à vous de choisir comment aller plus loin"
- Use "en chemin" instead of "IRL" — less jargon, less exclusionary
- Feature names are descriptive in French: "Croisements en chemin" not "Crossings IRL"

### Key Phrases

| Context | French | NOT |
|---|---|---|
| Tagline | "Gratuit. Sans limites." | "Gratuit. Pour toujours." |
| Empty crossings | "Vos chemins se croiseront bientôt" | "Sortez un peu !" |
| Chat bridge | "à vous de choisir comment aller plus loin" | "on échange et on se voit" |
| Feature label | "Croisements en chemin" | "Croisements IRL" |
| Beta banner | "Libre est en version bêta" | — |
| Error generic | "Une erreur est survenue, veuillez réessayer" | "Internal server error" |

## Elevation

| Level | Treatment | Use |
|---|---|---|
| Flat | No shadow, no border | Body sections, page floors |
| Hairline | 1px `border-gray-200` | Cards, inputs, dividers |
| Shadow-sm | `shadow-sm` | Cards on hover (rare) |
| Modal overlay | `bg-black/50` + centered card | Modals, dialogs |

Philosophy: color-block first, shadow rarely. Depth comes from surface contrast (white vs blush vs dark), not drop shadows.

### Shadow Tokens (rare, intentional)

| Token | Value | Use |
|---|---|---|
| `shadow-soft` | `0 2px 8px -2px rgb(232 99 74 / 0.08)` | Cards au hover, modal ouverte — **toujours teinté coral** pour rester dans l'univers |
| `shadow-pop` | `0 8px 24px -4px rgb(232 99 74 / 0.16)` | Menu ouvert, dropdown, célébration éphémère |
| `shadow-focus` | `0 0 0 3px rgb(232 99 74 / 0.4)` | Anneau de focus accessible (conforme WCAG 2.1) |

**Règle absolue** : pas d'ombre grise neutre (`shadow-md` par défaut Tailwind). Toute ombre porte la teinte coral pour rester dans le brand. Si tu hésites à mettre une ombre, mets une bordure à la place.

## Motion

Motion est un **token de design à part entière**, pas un afterthought. La gamification subtile vit dans ces tokens.

### Durées

| Token | Durée | Use |
|---|---|---|
| `motion-instant` | 80ms | Feedbacks immédiats (clic, toggle) |
| `motion-fast` | 160ms | Hover, focus, transitions d'état |
| `motion-base` | 240ms | Apparitions d'éléments, transitions de pages |
| `motion-slow` | 400ms | Célébrations, animations de récompense (rare) |
| `motion-celebrate` | 600ms | Streak atteint, première bio complétée — événement unique |

### Easing

| Token | Valeur | Use |
|---|---|---|
| `ease-out-soft` | `cubic-bezier(0.22, 1, 0.36, 1)` | Entrées d'éléments, apparitions |
| `ease-in-out-soft` | `cubic-bezier(0.65, 0, 0.35, 1)` | Transformations réciproques |
| `ease-celebrate` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Récompenses (un léger overshoot, jamais agressif) |

### Réduite

Toutes les animations doivent avoir un équivalent sous `@media (prefers-reduced-motion: reduce)` : passage instantané ou crossfade de 80ms. Pas d'exception. Tester en activant la préférence dans les DevTools avant chaque PR.

### Patterns gamification (subtile, jamais agressive)

- **Micro-célébration** : scale `1 → 1.05 → 1` sur l'élément validé, 240ms, ease-out-soft. Pas de popup, pas de son.
- **Streak discret** : un point coral apparaît à côté de l'avatar quand on a 3 jours d'activité. Pas de compteur visible, pas de "3 jours !".
- **Achievement** : badge rare (cœur plein + label court) qui apparaît dans le profil, jamais en popup. L'utilisateur le découvre en visitant son propre profil.
- **Premier match** : une seule fois, animation de cœurs qui s'épanouissent (1.2s, ease-celebrate, se répète jamais). Sinon, animation standard.

## Component Library

La rationalisation CSS passe par cette couche. **Aucun composant ne devrait être créé en dehors de ce set.** Si tu as besoin d'un nouveau composant, propose-le ici d'abord.

### Composants UI partagés (à créer dans `src/components/ui/`)

| Composant | États obligatoires | Variantes | Remplace |
|---|---|---|---|
| `Button` | default, hover, focus, active, disabled, loading | primary, secondary, ghost, danger | Tous les `<button>` et les liens stylés CTA |
| `Input` | default, hover, focus, error, disabled | text, email, password, search, textarea | Tous les `<input>` et `<textarea>` |
| `Card` | default, hover (rare), interactive | profile, crossing, match, filter, modal | Tous les blocs `rounded-xl border` du site |
| `Tag` | default, selected, hover, disabled | chip, badge | Tous les chips/badges dispersés |
| `Avatar` | default, with-online-dot, with-badge, placeholder | sm, md, lg, xl | Tous les avatars inline |
| `Modal` | open, closed | centered, bottom-sheet | Dialog, confirm, profile-modal |
| `EmptyState` | — | error, no-data, no-results, no-crossings | Tous les états vides "Nothing here" |
| `Toast` | enter, visible, exit (auto-dismiss) | success, info, error | Confirmations fugaces d'action (signalement, check-in validé, sauvegarde) |

### Règles

- Tous utilisent les tokens définis plus haut. Jamais de valeur inline.
- Tous supportent `prefers-reduced-motion`.
- Tous ont un équivalent dark mode.
- Tous ont des props ARIA cohérentes (cf. section Accessibility de `PRODUCT.md`).
- Aucun n'utilise `bg-gray-*` Tailwind brut : on passe par les tokens coral/blush/sand/abricot/miel/rose-poudré.

### Toast (`src/components/ui/Toast.tsx` + `src/lib/toast.ts`)

Confirmation **fugace** d'une action réussie — jamais une mécanique
d'engagement (cf. PRODUCT.md, principe 4). Pas de compteur, pas de son, pas
d'appât. On l'utilise pour rassurer sur les succès silencieux (signalement pris
en compte, check-in validé, sauvegarde), pas pour récompenser l'usage répété
(pas de toast à chaque like).

- **Déclenchement** : `toast(message, { tone?, icon?, duration? })` (event-bus
  `libre:toast`, comme `libre:instant-match`). `<ToastHost />` est monté une
  seule fois dans `(main)/layout.tsx`.
- **Position** : `fixed`, empilé en bas, centré, **au-dessus de la tab bar**
  via l'utilitaire `.bottom-chrome` (= hauteur nav + safe-area, cf. § Safe-area)
  — mobile-first. Pleine largeur mobile, `max-w-sm` au-delà.
- **Tones** : `success`/`error` = `bg-blush text-coral-dark` (univers coral,
  jamais de rouge toxique — l'erreur se distingue par l'icône, pas par une
  couleur agressive) ; `info` = `bg-white text-label border-sand`. Dark mode
  dédié (`dark:bg-coral/10 dark:text-coral-light`).
- **Motion** : `animate-toast-in` (translateY 12px + fade, `motion-base`,
  `ease-out-soft`) ; ramené à 80ms sous `prefers-reduced-motion` (bloc global).
- **A11y** : conteneur `role="status" aria-live="polite"` (annonce non
  intrusive) ; bouton Fermer 44px avec `aria-label` ; auto-dismiss (3,5s défaut,
  max 3 visibles).

## Responsive

| Breakpoint | Width | Key Changes |
|---|---|---|
| Mobile | < 640px | Bottom tab nav; single column; full-width cards |
| Tablet | 640–1024px | Bottom tab nav; 2-column grids |
| Desktop | > 1024px | Side nav (future); 3-column grids |

Touch targets: minimum 44px for interactive elements. Buttons at 36–40px height.

### Safe-area & chrome mobile

L'app tourne en `display: standalone` (PWA/TWA) : le contenu s'étend sous
l'encoche et la barre d'accueil. Le `viewport` racine porte `viewportFit: 'cover'`
(sinon `env(safe-area-inset-*)` reste à 0). Utilitaires dédiés dans `globals.css`
— **jamais de valeur `env()` inline dans un composant** :

| Utilitaire | Effet | Où |
|---|---|---|
| `.pt-safe` | `padding-top: env(safe-area-inset-top)` | Chrome sticky du haut (bannière + header) |
| `.pb-safe` | `padding-bottom: env(safe-area-inset-bottom)` | Bottom tab bar |
| `.pb-nav` | réserve `--nav-h` + safe-area du bas | `<main>` défilant, pour ne pas passer sous la nav |
| `.bottom-chrome` | ancre à `--nav-h` + safe-area + 0.75rem | Chrome flottant (feedback, thème, toast) |

- `--nav-h` (`:root`, `3.5rem`) est la hauteur de contenu de la tab bar ; la nav
  la matérialise via `min-h-14` et tout le reste s'y réfère → une seule source.
- La **bottom tab bar** est séparée du contenu par un `border-t` hairline
  (`border-gray-200 / dark:border-gray-800`), jamais une ombre grise neutre.
- **Pas de footer légal fixe** dans la coquille **app connectée** : les liens
  légaux y vivent dans `/settings` (§ « Informations légales »), standard mobile.
  _Exception_ : la **landing publique** (visiteurs non connectés) garde un footer
  légal — cf. § Theming Axe 3 « Footer landing » (`LobbyFooter`).

## Do's and Don'ts

### Do

- Anchor every page on white/blush — warm tint is the brand differentiator
- Reserve coral for primary CTAs, logo, and active states; don't paint everything coral
- Use `text-gray-600` minimum on light backgrounds (WCAG AAA)
- Write French copy that assumes nothing about the user's abilities or circumstances
- Pair white cards with blush section backgrounds for warmth
- Use pill radius for tags/badges/avatars; md for buttons/inputs; lg/xl for cards

### Don't

- Don't use `text-gray-400` or `text-gray-500` on light backgrounds for content text (fails WCAG or limits readability)
- Don't make placeholder as visible as input value text — placeholder must be lighter + italic
- Don't use cool blues or pure grays as brand accent — coral is Libre
- Don't write exclusionary copy ("sortez", "IRL", "on se voit")
- Don't expose technical error details to users — generic French messages only
- Don't use serif fonts — Libre is modern, not literary
- Don't add shadow for depth — use surface color contrast instead
- Don't use English in the UI — always French

## Iteration Guide

1. Reference token names, never inline hex values. `text-coral` not `text-[#E8634A]`.
2. Variants (hover, focus, disabled, dark) live in this doc as separate entries.
3. When adding a new component, define it here with token refs before building.
4. Accessibility first: follow the 5-level visual hierarchy. Input text > labels > body > secondary > placeholders.
5. Placeholders are always `text-gray-400 italic` — lighter than typed text, with italic for visual distinction.
5. Copy changes must pass the inclusivity checklist (no mobility assumptions).