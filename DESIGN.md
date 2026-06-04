---
version: 1.0
name: Libre Design System
description: A warm, inclusive dating app built on coral and cream — deliberately human, never corporate. Freedom-first: no paywalls, no data resale, no algorithmic manipulation.
---

# DESIGN.md — Libre

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

### Règles

- Tous utilisent les tokens définis plus haut. Jamais de valeur inline.
- Tous supportent `prefers-reduced-motion`.
- Tous ont un équivalent dark mode.
- Tous ont des props ARIA cohérentes (cf. section Accessibility de `PRODUCT.md`).
- Aucun n'utilise `bg-gray-*` Tailwind brut : on passe par les tokens coral/blush/sand/abricot/miel/rose-poudré.

## Responsive

| Breakpoint | Width | Key Changes |
|---|---|---|
| Mobile | < 640px | Bottom tab nav; single column; full-width cards |
| Tablet | 640–1024px | Bottom tab nav; 2-column grids |
| Desktop | > 1024px | Side nav (future); 3-column grids |

Touch targets: minimum 44px for interactive elements. Buttons at 36–40px height.

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