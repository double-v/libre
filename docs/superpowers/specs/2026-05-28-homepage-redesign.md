# Libre Layouts Redesign Spec

## Goal

Redesign both the public homepage and the authenticated app shell to share a consistent visual language — coral palette, no gray borders, soft shadows, logo prominence — while improving trust, conversion, and navigation.

## Shared Design Decisions

- **Visual style:** Energie & Liberte — dynamic, vivid, spontaneous
- **Colors:** No dark/black bands — blush (#FDF0ED), sand (#F5E6D8), white, coral (#E8634A) / terracotta (#C4503A) accents
- **Borders:** Zero gray borders/contours — cards use soft `box-shadow` only
- **Logo:** Project sun+heart SVG used consistently in nav and hero
- **Dark mode:** existing `dark:` variants continue to work

---

## Part 1: Homepage (`src/app/page.tsx`)

### Design decisions

- **Layout:** Split screen hero (text left, logo illustration right), centered content sections
- **Illustrations:** Project logo as hero illustration with floating trust badges
- **Hero background:** Stock photo (Unsplash) with blur + semi-transparent blush overlay
- **Content width:** Centered with `max-w-2xl` / `max-w-md` to keep density

### Sections (top to bottom)

#### 0. Nav bar
- Left: Logo component (SVG icon + "Libre" text in coral)
- Right: "Se connecter" text link + "Creer un compte" coral pill button
- Background: transparent (over hero blur)

#### 1. Hero (split screen)
- **Left:** "Libre" in coral as large title, tagline, description, two CTA buttons (solid terracotta + white semi-transparent)
- **Right:** Large logo SVG (semi-transparent, decorative) with 3 floating trust badges ("Chiffre E2E", "Badge verifie", "Moderation") — white pill badges with coral text + soft shadow
- **Background:** Stock photo with `blur(6px) brightness(1.15)` + gradient overlay `rgba(253,240,237,0.9)` to `rgba(245,230,216,0.85)`
- **Mobile:** Stacks vertically (text above, illustration below)

#### 2. Chiffres
- Background: blush
- 3 centered columns `max-w-lg mx-auto`
- "~240 EUR / Cout annuel moyen d'un abonnement dating"
- "47% / Des abonnes regrettent leur achat / UFC-Que Choisir, 2025"
- "0 EUR / Chez Libre. Pour toujours." (coral highlight)

#### 3. Constat
- Background: white
- Title: "Les apps de rencontre font payer l'espoir"
- 4 cards 2x2 grid, `max-w-md mx-auto`, blush bg, rounded, soft box-shadow
- Same 4 items as current page (likes limites, microtransactions, prix variables, renouvellement piege)

#### 4. Argument Libre
- Background: sand
- Title + paragraph + 3 white cards `max-w-md mx-auto` (Croisements, Chat chiffre E2E, Moderation communautaire)
- Subtext preserved from current page

#### 5. Vie privee
- Background: blush
- Title: "Votre vie privee n'est pas un produit"
- 4 cards 2x2 grid, `max-w-sm mx-auto`, white bg, rounded, soft box-shadow
- Icons: emoji or inline SVG (lock, shield, checkmark, people)

#### 6. CTA final
- Background: gradient coral to terracotta
- Title + subtext + white pill button "Creer un compte"

#### 7. Footer
- Centered mini-logo (faded coral) + CGU link
- No border-top

### Technical notes

- Stock photo: Unsplash CDN via `next/image` (remotePatterns already configured)
- Logo: reuse `Logo.tsx` for nav, inline SVG for hero illustration
- JSON-LD SoftwareApplication schema stays
- All current text content preserved, just restructured + centered

---

## Part 2: Authenticated Shell (`src/app/(main)/layout.tsx`)

### Design decisions

- **No gray borders:** remove all `border-b border-gray-100` / `border-t border-gray-200`
- **Distinct tab icons:** replace 5 identical circles with meaningful SVG icons
- **Soft shadows:** header and bottom nav use `shadow` instead of borders
- **Header gear icon:** add settings link in header

### Header (sticky top)
- Left: Logo (inline SVG on coral rounded square + "Libre" text) → links to `/discover`
- Right: Settings gear icon → links to `/settings`
- Background: `bg-white/80 backdrop-blur-md` (glassmorphism, kept)
- **Removed:** `border-b border-gray-100`
- **Added:** `shadow-sm` for subtle lift

### Bottom tab bar (fixed bottom)
- **Removed:** `border-t border-gray-200`
- **Added:** `shadow-[0_-1px_6px_rgba(0,0,0,0.04)]` for top lift
- 5 tabs with distinct SVG icons:

| Route | Label | Icon (SVG) | Active state |
|---|---|---|---|
| `/discover` | Decouvrir | Heart (filled when active) | `fill-coral stroke-coral` |
| `/crossings` | Croisements | Crossing paths (two diagonal lines) | `stroke-coral` |
| `/nearby` | A proximite | Map pin | `stroke-coral` |
| `/matches` | Matches | Chat bubble | `stroke-coral` |
| `/profile` | Profil | User silhouette | `stroke-coral` |

- Active: icon in coral + coral text + font-weight 600
- Inactive: icon in gray (`#aaa` outline) + gray text
- Icon size: 20x20, label 8-9px below

### Unchanged elements
- Beta banner (top dismissible)
- MatchDialog (Pusher overlay)
- FeedbackButton (floating FAB)
- ThemeToggle (floating FAB)
- `max-w-lg mx-auto` page content width
- `pb-16` padding for bottom nav clearance

---

## Out of Scope

- Dynamic content (user counts, live testimonials)
- A/B testing infrastructure
- App store badges / QR code
- Page-level content changes (discover, crossings, etc.)
- Chat layout changes