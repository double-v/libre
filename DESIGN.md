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
| ink | `#171717` | `text-gray-900` | 17.4:1 | Headlines, primary text |
| body-strong | `#1f2937` | `text-gray-800` | 13.5:1 | Emphasized paragraphs |
| body | `#374151` | `text-gray-700` | 8.3:1 | Default running text |
| body-secondary | `#4b5563` | `text-gray-600` | 7.5:1 | Secondary text, descriptions |
| muted | `#4b5563` | `text-gray-600` | 7.5:1 | Labels, timestamps, sub-headings (WCAG AAA) |
| muted-soft | `#9ca3af` | `text-gray-400` | 2.8:1 | **Dark backgrounds only** (7.3:1 on dark) — never on light |
| on-coral | `#FFFFFF` | `text-white` | — | Text on coral/terracotta backgrounds |
| on-dark | `#ededed` | `dark:text-gray-200` | — | Text on dark surfaces |

**Accessibility rule**: `text-gray-400` is FORBIDDEN on light backgrounds (fails WCAG AA at 2.8:1). Minimum on white is `text-gray-600` (7.5:1, passes AAA). On dark backgrounds, `text-gray-400` passes AAA at 7.3:1.

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
| text-input | white | 1px gray-300 | md | 40px | All text inputs |
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

- Don't use `text-gray-400` or `text-gray-500` on white/light backgrounds — fails/limits WCAG (2.8:1 / 4.6:1)
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
4. Accessibility first: every text-on-light choice must pass WCAG AAA (7:1). Use `text-gray-600` minimum on white.
5. Copy changes must pass the inclusivity checklist (no mobility assumptions).