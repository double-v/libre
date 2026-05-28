# Homepage Redesign Spec

## Goal

Redesign the Libre homepage (`src/app/page.tsx`) to inspire trust, convey energy and freedom, and drive registration — replacing the current text-only layout with a visually rich, conversion-optimized page.

## Design Decisions

- **Layout:** Split screen hero (text left, illustration right)
- **Visual style:** Energie & Liberte — dynamic, vivid, spontaneous
- **Illustrations:** Vectorielles (undraw.co style, coral/terracotta palette) — no profile photos on homepage
- **Colors:** No dark/black bands — blush (#FDF0ED), sand (#F5E6D8), white, coral accents
- **Borders:** Zero gray borders/contours — cards use soft box-shadows only
- **Hero background:** Stock photo with blur + semi-transparent blush overlay

## Sections (top to bottom)

### 1. Hero (split screen)
- **Left:** Label "Rencontre gratuite", headline "Parce que rencontrer ne devrait rien couter." (with "couter" in coral), subtext "0EUR. Pas d'abonnement. Pas de microtransaction. Pas de revente de donnees. Chat chiffre E2E.", two CTA buttons ("Creer un compte gratuitement" solid coral, "Se connecter" white semi-transparent)
- **Right:** SVG illustration — two stylized figures facing each other with heart, chat bubbles, connection line, lock icon (E2E). Colors: coral, terracotta, coral-light.
- **Background:** Stock photo (Unsplash, couple/romance theme) with `blur(6px) brightness(1.1)` + gradient overlay `rgba(253,240,237,0.88)` to `rgba(245,230,216,0.85)`

### 2. Trust bar
- Background: blush
- 4 centered items: "0EUR / Pour toujours", "E2E / Chiffrement", "Zero / Donnees revendues", "Verifie / Badge identite"
- Numbers in coral bold, labels in gray

### 3. Problem section
- Background: white
- Title: "Les apps de rencontre font payer l'espoir"
- 4 cards in 2x2 grid, each: blush background, rounded corners, soft box-shadow (no borders)
  - "~240EUR/an / Cout moyen d'un abonnement dating"
  - "47% regrettent / Leur achat dans le mois (UFC-Que Choisir)"
  - "Prix variables / Deux personnes voisient des prix differents"
  - "Renouvellement piege / On oublie d'annuler, les prelevements continuent"

### 4. Why free section
- Background: sand
- Left: title "Gratuit = plus de celibataires = plus de chances" + paragraph
- Right: 3 mini SVG illustrations with labels (Croisements, Chat chiffre, Verifie)

### 5. Privacy & safety section
- Background: white
- Title: "Votre vie privee n'est pas un produit"
- 4 cards in 2x2 grid: blush background, rounded corners, soft box-shadow
  - "Chiffrement E2E / Le serveur ne lit jamais vos messages"
  - "Zero revente / Vos donnees ne sont jamais vendues"
  - "Badge verifie / Photos verifiees par selfie"
  - "Moderation / Signalement et blocage communautaire"
- Icons: emoji or simple SVG (lock, shield, checkmark, people)

### 6. Final CTA
- Background: gradient coral to terracotta
- Title: "0EUR. Pas d'abonnement. Pas de pieges."
- Subtext: "Rejoignez ceux qui refusent de payer pour esperer."
- Button: white pill, coral text, "Creer un compte"

### 7. Footer
- No border-top
- Link to CGU, gray text

## Technical Notes

- Stock photo: served from Unsplash CDN via `next/image` with `remotePatterns` already configured
- SVG illustrations: inline `<svg>` in the component (no external dep)
- Dark mode: existing `dark:` variants continue to work — blush becomes dark equivalent, sand becomes dark equivalent
- Mobile: split hero stacks vertically (illustration below text)
- All text content preserved from current page, just restructured
- JSON-LD SoftwareApplication schema stays

## Out of Scope

- Dynamic content (user counts, live testimonials)
- A/B testing infrastructure
- App store badges / QR code (web app, not native)
- Footer redesign beyond removing border