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

## Theming — Mode × Thème

Le theming a **deux axes orthogonaux**. Ne jamais les confondre : le **mode** est perceptuel (confort / accessibilité, suit l'OS) ; le **thème** est une identité graphique (goût). Le choix de thème est un **signal doux** de préférence utilisateur — jamais affiché comme une récompense, jamais gamifié (cf. PRODUCT.md, principe 4).

> **Unification (épic thèmes globaux).** Les anciens axes « skin » (app : `libre` / `libre-warm`) et « lobby » (landing : `cartoon` / `arcade` / `retro`, jadis toujours sombres, portés par `data-lobby`) ne font plus qu'**un**. Les 3 thèmes de la landing sont devenus de **vrais thèmes app**, déclinés clair **et** sombre. Un seul registre, un seul sélecteur (`ThemeMenu`), une seule clé (`libre-skin`) — partout : app connectée, guest, admin, landing.

### Axe 1 — Mode (`light` / `dark` / `auto`)

- Porté par la classe `.dark` sur `<html>` (script no-flash dans `layout.tsx`).
- `auto` (défaut) suit `prefers-color-scheme`. Persisté : `localStorage['libre-theme']` = `light | dark | auto`.
- **Tout thème existe en light ET en dark.** Le mode ne dépend jamais du thème.
- « blanc » n'est pas un thème à part : le light par défaut EST blanc/blush. Light/dark = mode, pas thème.

### Axe 2 — Thème (`data-theme` sur `<html>`)

- Porté par `data-theme="<id>"` sur `<html>` (registre `src/lib/site-themes.ts`).
- **Sélectionnable par l'utilisateur** via `ThemeMenu` (popover mode×thème) dans les **contextes invités** (auth) et **admin**, et **miroir dans les Paramètres** (`AppearanceSettings`). Le `TopNav` de l'app ne porte qu'un `ThemeToggle` (axe **Mode** seul) ; la **landing publique n'expose aucun sélecteur** (les invités voient le thème par défaut du site). *(NB : la convergence shell #273 refondra ces surfaces.)*
- Persisté : `localStorage['libre-skin']` (+ `User.skin` pour les comptes, synchronisé cross-appareils).

**Précédence du thème :**
1. Choix explicite user — `localStorage['libre-skin']` (+ `User.skin`).
2. Défaut du site — `SiteConfig.currentTheme` (piloté admin).
3. `libre`.

> **Décisions arrêtées :**
> - **Admin = défaut, user = souverain.** `SiteConfig.currentTheme` fixe le thème *par défaut* ; le choix explicite de l'utilisateur le remplace toujours. Pas de thème forcé par l'admin.
> - **« La Place » reste hors de cet axe.** Les thèmes événementiels de section (`square_theme_configs`, planifiés / admin) demeurent un système séparé — mais **ancrés sur les mêmes tokens sémantiques** du layout global (ils surchargent des accents de section, jamais un système parallèle qui les combat).

### Contrat de tokens sémantiques (le cœur de la rationalisation)

Les composants **ne codent jamais le mode en dur** (`bg-white dark:bg-dark-surface`, `text-gray-900 dark:text-gray-100`) : ils lisent des **utilitaires Tailwind** mappés sur des **variables runtime** que chaque `thème × mode` redéfinit.

**Mécanique (Tailwind v4)** : `@theme inline { --color-x: var(--x) }` génère `bg-x` / `text-x` qui référencent `var(--x)` ; `--x` est défini dans `:root` / `:root.dark` (thème `libre`) et **surchargé par thème** dans `html[data-theme='y']` (clair) / `html[data-theme='y'].dark` (sombre). ⚠️ **Un token *littéral* dans `@theme inline` n'est PAS surchargeable** (Tailwind l'inline à la compilation) — d'où l'indirection `var()` **obligatoire** pour tout token censé re-skinner (c'est le correctif qui a rendu l'accent coral réellement thémable).

| Var runtime | Utilitaire | Rôle | Remplace le binaire |
|---|---|---|---|
| `--background` | `bg-background` | plancher de page | `bg-white dark:bg-gray-950` |
| `--surface` | `bg-surface` | carte / panel | `bg-white dark:bg-dark-surface` |
| `--elevated` | `bg-elevated` | surface surélevée | `dark:bg-dark-elevated` |
| `--sunken` | `bg-sunken` | fond de section chaud | `bg-blush dark:bg-coral/10` |
| `--content` | `text-content` | texte principal | `text-gray-900 dark:text-gray-100` |
| `--muted` | `text-muted` | texte secondaire | `text-gray-600 dark:text-gray-400` |
| `--hairline` / `--hairline-strong` | `border-hairline` / `-strong` | filet / bordure de contrôle | `border-gray-200 dark:border-dark-border` |
| `--fill-subtle` | `bg-fill-subtle` | fond chip neutre | `bg-gray-100 dark:bg-gray-800` |
| `--coral` / `--coral-light` / `--terracotta` / `--coral-dark` | `*-coral`, `*-coral-light`… | accent (varie par thème) | `text-coral`, `bg-coral`, `bg-terracotta` |
| `--blush` / `--sand` / `--gold` | `bg-blush` / `bg-sand` / `text-gold` | fonds chauds / or (accomplissement) | — |
| `--rad-card` / `--rad-control` | `rounded-card` / `rounded-control` | arrondis (**varient par thème**) | `rounded-xl`, `rounded-md` |
| `--head-font` | `font-head` | police des titres (**varie par thème**) | Geist |
| `--btn-clip` | `clip-path` (classe / `style`) | silhouette bouton (biseau arcade, pixel retro) | — |

Règle : **un thème = un delta.** Il ne redéfinit que ce qui diffère de la base ; le reste hérite. « light + dark par thème » ≈ deux petits blocs de variables, pas deux designs complets.

**Données** : les thèmes du catalogue vivent en **CSS** (`globals.css`). `SiteTheme.tokenOverrides` reste réservé à d'éventuels thèmes DB custom. Le script no-flash de `layout.tsx` pose **avant paint** la classe `.dark` (mode) **et** `data-theme` (thème) lus en `localStorage` (sinon flash).

### Catalogue

Registre unique `src/lib/site-themes.ts` (`SITE_THEMES`). Chaque thème est décliné **light + dark** ; les valeurs vivent en CSS (`globals.css`).

| id | Ex- | Direction | `--head-font` | `--rad-card` / `control` | Silhouette bouton |
|---|---|---|---|---|---|
| `libre` (défaut) | `default` | Coral/cream, chaud lumineux | Sans (Geist/Inter) | 16 / 6px | pleine |
| `libre-warm` | `c-warm` | Terracotta, crème profond | Sans | 16 / 6px | pleine |
| `cartoon` | ex-lobby | Plum-black chaud, rondeurs généreuses | Baloo 2 | 24 / 14px | pleine |
| `arcade` | ex-lobby | Bleu-noir néon, glow coral | Space Grotesk | 16 / 10px | coin biseauté |
| `retro` | ex-lobby | 8-bit, ombres dures, scanlines | Space Grotesk (+ Press Start 2P eyebrow) | 4 / 2px | pixel-clip |

**Polices** (via `next/font/google`, self-host — **jamais** de `<link>` Google/CDN, cf. CSP + perf) : déclarées au **layout racine** (`--font-space-grotesk`, `--font-baloo`, `--font-press-start`), sélectionnées par thème via `--head-font`. Garde-fou : **Press Start 2P = eyebrow/accents du thème `retro` uniquement**, jamais le corps de texte (lisibilité).

### Garde-fous (obligatoires, tout thème × mode)

- **Contraste WCAG AA** vérifié sur light ET dark (4.5:1 texte, 3:1 grands titres) — sur les **5 thèmes × 2 modes**.
- `color-scheme: light|dark` déclaré par mode (contrôles natifs, scrollbars, autofill).
- **Polices display** (Baloo, Press Start) : titres / accents uniquement — jamais le corps de texte.
- Toute animation de thème a son équivalent `prefers-reduced-motion`.
- Le thème change l'**habillage**, jamais la **sémantique** : un CTA reste « accent » via `--coral`, une erreur reste `--error`.
- Zéro valeur inline dans les composants — tout via tokens.
- **Validation** : chaque composant DS est vérifié sur les 10 déclinaisons via `/design` + `/design-sync` (le render-check `variantsIdentical` détecte un thème/mode qui n'a pas re-skinné).

### La landing « lobby »

La home publique (`src/app/page.tsx`, épic #243) garde sa **mise en page lobby**
(hero ambiant, skyline parallax, personnages qui marchent, ciel jour/nuit) et son
identité **sombre-chaude** comme *présentation*. Son **thème n'est plus un axe
séparé** : il suit `html[data-theme]`, résolu depuis le **défaut du site**
(`SiteConfig.currentTheme`, piloté admin) — la landing **n'expose aucun sélecteur**
(impression de marque cohérente ; la personnalisation est réservée à l'app
connectée / aux Paramètres). `arcade`/`retro` reskin l'ambiance lobby ;
`libre`/`libre-warm`/`cartoon` → ambiance cartoon par défaut.

- Le conteneur racine porte `data-lobby` comme **simple marqueur** (sans valeur) ;
  les tokens `--lobby-*` **cascadent depuis `html[data-theme]`** (bloc par défaut =
  cartoon, `html[data-theme='arcade'|'retro'] [data-lobby]` surchargent). Les
  classes `.lobby-*` consomment `--lobby-*` — **inchangées** (réconciliation
  CSS-only, sans réécrire les composants).
- **Toujours sombre par design** (indépendant du mode `.dark`) : l'ambiant reste
  sombre-chaud, jamais froid bleuté (cf. PRODUCT.md, anti-réf) — le mode
  clair/sombre choisi ailleurs dans l'app n'altère pas l'ambiant.
- Plus de switcher lobby dédié, plus de clé `libre-lobby-theme`, plus de script
  no-flash local (le script de `layout.tsx` pose `data-theme` avant paint).
- **Garde-fous** (comme tout thème) : **reduced-motion** obligatoire sur chaque
  animation (blobs, mot rotatif, personnages/bulles, parallax skyline, oiseaux,
  étoiles, scanlines) — settle statique ; WCAG AA ; focus ring coral ; cibles
  ≥ 44px ; zéro hex inline.

**Footer landing** (`LobbyFooter`, #250) : la landing s'adresse à des visiteurs
**non connectés**, donc les liens légaux (CGU, confidentialité, mentions légales,
FAQ) + social + code source ouvert **vivent dans un footer** de la home — c'est
l'**exception** à la règle app shell « pas de footer légal, tout dans `/settings` »
(cf. § Layout & Safe-area), qui ne vaut que pour l'app connectée. Stylé via les
tokens de thème, landmarks `<nav aria-label>` + `<footer>`.

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

## Shell unifié (#273)

> **En cours** (épic #273). Objectif : un **seul** shell (nav + colonne centrale +
> tokens), issu du design validé de la home, consommé par **toutes** les zones — en
> remplacement des ~5 shells ad hoc actuels (`LobbyNav`, `TopNav`, nav maison de
> `/manifesto`, largeurs `max-w-*` dispersées). Migration progressive zone par
> zone ; `TopNav`/`LobbyNav` retirés au cleanup (#283).

### Principes

- **Une structure, deux variantes de session.** Le shell est unique ; seule la
  **variante** de nav change (guest vs connecté). Jamais deux systèmes de nav.
- **Theme-aware, jamais froid.** On reprend la *structure* de la home (barre sticky
  translucide, colonne centrale, respiration), mais on respecte le mode clair/sombre
  (PRODUCT.md, principe 2 : « pas de neutre froid par défaut »). Le sombre-chaud
  « always dark » reste une **signature home-only**.
- **Densité douce** (PRODUCT.md, principe 5) : les pages contenu respirent large,
  l'app connectée reste compacte et mobile-first.

### `SiteNav` — nav unique (composant DS, #276)

Barre **sticky** translucide thémée (`bg-surface/80 backdrop-blur`, `border-hairline`,
`pt-safe`), marque cœur-soleil → `/` (guest) ou `/discover` (connecté). Deux variantes :

- **guest** : liens publics (*Manifesto*, *Se connecter*) + CTA **Créer un compte**.
- **connecté** : `ThemeToggle` (Mode) + *Admin* (si `ADMIN`) + *Paramètres*. La
  **bottom tab bar** reste la nav de sections de l'app — décision : on **ne fusionne
  pas** la tab bar dans la barre du haut, les deux coexistent.

Remplace `LobbyNav`, `TopNav` et la nav ad hoc de `/manifesto`. A11y : landmark
`<nav aria-label>`, focus ring coral, cibles ≥ 44px.

**Contrôle du thème (règle figée, session 2026-07-12)** : le nav ne porte que le
`ThemeToggle` (axe **Mode**) ; le **choix du thème** vit dans les Paramètres
(`AppearanceSettings`). La landing publique n'expose **aucun** sélecteur (thème =
défaut du site). `ThemeMenu` (popover complet) ne subsiste que là où il n'y a pas
d'accès Paramètres — à réconcilier en #281.

### Échelle de largeurs (centralisée, #277)

Une seule source de vérité — le composant **`SiteShell`** (cf. Component Library),
adossé aux tokens `--container-*` de `globals.css` (`@theme`) — en remplacement des
`max-w-*` dispersés (448 / 512 / 672 / 768 / 1080 aujourd'hui) :

| Largeur (`width`) | Utilitaire | Valeur | Usage |
|-------------------|------------|--------|-------|
| `content` | `max-w-content` | 1080px | pages contenu larges (home, sections marketing) |
| `reading` | `max-w-reading` | 720px | texte long centré (manifesto, légal) |
| `app` | `max-w-lg` | 512px | app connectée mobile-first (feed, messages, profil) |

Décision (#273) : les pages *contenu* adoptent `content`/`reading` ; l'app garde
`app` (mobile-first, UX cartes/swipe) **dans le même shell/nav/tokens**. Remplace la
grille marketing `max-w-2xl` de la section **Layout** ci-dessus une fois migré.

**Largeur `content` — question ouverte tranchée (#277)** : une **seule valeur**
`1080px` (pas d'échelle fine hero 1180 / sections 1080). Le hero de la home peut
déborder localement en `max-w-*` explicite si besoin ; l'échelle partagée reste à
un seul cran large pour rester une vraie source de vérité (moins de boutons).

### Ambiance & décor

- **Décor animé** (blobs, skyline, personnages) = **home-only**. Les sous-pages
  reprennent la *structure* + les tokens, **pas** le décor (focus, perf).
- **Home always-dark** : la home reste sombre-chaude même en mode clair global
  (signature de présentation) ; partout ailleurs, le shell suit le mode.

### Garde-fous (toute zone × mode)

- Rendu vérifié **light ET dark** sur les **5 thèmes** ; contraste WCAG AA.
- Chaque animation a son équivalent `prefers-reduced-motion`.
- Cibles ≥ 44px ; focus ring coral ; **tokens only** (zéro hex / `bg-gray-*` inline).
- Copy FR.

### Questions ouvertes (tranchées au fil des sous-tickets)

- ~~Largeur `content` : valeur unique ~1080px, ou échelle fine reprise de la home
  (hero 1180 / sections 1080) ?~~ **Tranché (#277)** : valeur unique `1080px`.
- `/manifesto` & légal : structure seule, ou une touche de décor discrète ? (#278 / #279)

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

- **`TopNav`** (DS, `src/components/ui/TopNav.tsx`) : **en-tête unifié**, présent
  partout (app connectée, guest, admin, pages légales). Marque (`Logo`) → `/`
  (guest) ou `/discover` (connecté) ; à droite, le **`ThemeToggle`** (bascule Mode
  Clair/Sombre/Auto ; le choix du **thème** vit dans les Paramètres — cf.
  `AppearanceSettings`), puis les actions selon l'état de session :
  - **guest** : *Manifesto* / *Se connecter* / **Créer un compte** (CTA `Button`).
  - **connecté** : *Admin* (si `ADMIN`) + *Paramètres*.
  Sticky, `bg-surface/80 backdrop-blur`, porte la safe-area (`pt-safe`). Ne
  remplace **pas** la bottom tab bar (nav principale mobile de l'app connectée) :
  les deux coexistent.
- **Bottom tab bar** (app connectée) : 4 onglets (Découvrir, Messages, La Place,
  Profil), `bg-surface border-t border-hairline`, icônes + labels, actif coral.
- **`ThemeMenu`** (DS, `src/components/ui/ThemeMenu.tsx`) : popover mode×thème —
  **contextes invités (auth) + admin** (cf. § dédié plus bas).
- **`ThemeToggle`** (DS, `src/components/ui/ThemeToggle.tsx`) : bascule **Mode seul**
  (Clair → Sombre → Auto, un clic, sans popover) portée par le `TopNav` (cf. § dédié plus bas).
- **Auth nav**: Centered Logo component (heart-sun icon + "Libre" text), links to `/`

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
| `ThemeMenu` | closed, open, focus-trap | popover (desktop), bottom-sheet (mobile) | `LobbyThemeSwitcher`, radios d'apparence en double |
| `ThemeToggle` | light, dark, auto | icon-button (cycle Mode) | boutons Mode ad hoc dans les headers |
| `TopNav` | guest, connecté, admin | — | Header inline `(main)`, `PublicHeader`, header lobby |
| `SiteShell` | — | content, reading, app | Les `mx-auto max-w-* px-*` ad hoc dispersés (448/512/672/768/1080) |

### Règles

- Tous utilisent les tokens définis plus haut. Jamais de valeur inline.
- Tous supportent `prefers-reduced-motion`.
- Tous ont un équivalent dark mode.
- Tous ont des props ARIA cohérentes (cf. section Accessibility de `PRODUCT.md`).
- Aucun n'utilise `bg-gray-*` Tailwind brut : on passe par les tokens coral/blush/sand/abricot/miel/rose-poudré.

### SiteShell (`src/components/ui/SiteShell.tsx`)

Conteneur central partagé du **shell unifié** (#277, épic #273) : une colonne
centrée (`mx-auto`), pleine largeur sous le plafond, avec gouttières responsives
(`px-4 sm:px-6`). **Source de vérité unique des largeurs** — remplace les
`mx-auto max-w-* px-*` recodés zone par zone.

- **Prop `width`** (défaut `content`) → échelle centralisée ci-dessus :
  `content` (`max-w-content`, ~1080px) · `reading` (`max-w-reading`, ~720px) ·
  `app` (`max-w-lg`, 512px). Les utilitaires `max-w-content`/`max-w-reading`
  proviennent des tokens `--container-*` de `globals.css` (`@theme`).
- **Prop `as`** : balise sémantique (`div` défaut, `main`, `section`, `article`).
- **`className` additif** (ex. `py-12`, alignement) — ne surcharge pas les
  largeurs/gouttières de l'échelle (passer par `width` pour ça).
- **Server Component** (pur wrapper, aucun hook) — utilisable dans les layouts.
- Consommé au fil de la migration : #278 manifesto, #279 légal, #280 app,
  #281 auth/admin.

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

### ThemeMenu (`src/components/ui/ThemeMenu.tsx`)

Point d'entrée **complet** du theming (mode **et** thème réunis), en **popover**.
Porté par les **contextes invités** (auth) et **admin** — là où l'on veut exposer
le choix de thème sans page Paramètres. La **landing publique** n'expose aucun
sélecteur (les invités voient le défaut du site) ; le `TopNav` de l'app ne porte
qu'un `ThemeToggle` (mode seul), le choix du thème passe par les Paramètres
(`AppearanceSettings`). Consolide les sélecteurs ad hoc historiques
(`LobbyThemeSwitcher`, radios en double).

- **Déclencheur** : `Button` `ghost` compact = pastille du thème courant (swatch
  accent + surface) + nom court. `aria-haspopup="dialog"` + `aria-expanded`.
- **Panneau** : **popover** ancré sous le bouton (desktop, `shadow-pop`,
  `bg-surface`, `rounded-card`, `border-hairline`) ; **bottom-sheet** plein-largeur
  (mobile, `pb-safe`). Deux sections :
  1. **Mode** — segment 3 choix *Clair / Sombre / Auto* (`aria-pressed`),
     application instantanée.
  2. **Thème** — grille de cartes (une par `SITE_THEMES`) : **mini-aperçu des
     couleurs dominantes** (fond `--background` ambiant + accent `--coral` +
     pointe `--gold`), via `data-theme` local sur la vignette — cartoon/arcade/
     retro prévisualisés en **sombre** (leur identité dominante), libre/libre-warm
     en clair. Libellé, état sélectionné (anneau coral + coche). Application
     **optimiste** (le `<html>` re-skin au clic, avant toute I/O).
- **Invitation guest** (session absente) : ligne discrète en pied —
  « Crée un compte pour garder ton thème sur tous tes appareils » → `/register`,
  et « Se connecter » → `/login`. Jamais bloquant : le choix marche en local sans
  compte (`localStorage`).
- **État** : lit/écrit via `useThemePreference` (source de vérité unique :
  `localStorage` + DOM + synchro best-effort `PUT /api/users/skin`).
- **A11y** : panneau `role="dialog" aria-modal="true"` + `aria-label` ; **focus
  trap** ; **Esc** et **clic-dehors** ferment ; focus rendu au déclencheur ;
  cibles ≥ 44px ; ouverture animée (`motion-fast`, `ease-out-soft`) avec
  équivalent `prefers-reduced-motion` (apparition instantanée).
- **Garde-fou re-skin** : les vignettes d'aperçu **doivent** différer d'un thème à
  l'autre (elles portent `data-theme` en local) — c'est le contrôle visuel que le
  système de tokens fonctionne, en écho au render-check `variantsIdentical`.

### ThemeToggle (`src/components/ui/ThemeToggle.tsx`)

Bascule d'apparence **compacte** (axe **Mode** uniquement), portée par le `TopNav`.
Un `icon-button` qui **cycle** Clair → Sombre → Auto (système) en un clic, **sans
popover** — pensé pour un geste rapide et fréquent. Le **choix du thème** (skin)
n'est *pas* ici : il vit dans les Paramètres (`AppearanceSettings`) et sur la
landing (`ThemeMenu` complet).

- **Bouton** : `icon-button` (`min-h-[44px]`, `rounded-control`, `text-muted` →
  `hover:bg-fill-subtle hover:text-content`) ; icône = état courant (soleil / lune /
  écran « système »), `aria-hidden`. S'aligne visuellement sur les autres boutons
  d'icône du `TopNav` (Admin, Paramètres).
- **A11y** : `aria-label` **dynamique** annonçant le mode courant **et** l'action au
  clic (« Apparence : Sombre. Cliquer pour passer en Auto (système). ») ; cible
  ≥ 44px ; focus ring coral. Pas d'animation propre — le swap d'icône est instantané,
  la `transition-colors` est clampée par le bloc global `prefers-reduced-motion`.
- **État** : lit/écrit `mode` via `useThemePreference` (même source de vérité que
  `ThemeMenu` / `AppearanceSettings` : `localStorage['libre-theme']` + classe `.dark`
  sur `<html>`, `auto` suit l'OS).
- **Cohérence** : n'expose **jamais** le thème (skin) — un seul geste, un seul axe.

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