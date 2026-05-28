# Homepage Redesign Spec

## Goal

Redesign the Libre homepage (`src/app/page.tsx`) to inspire trust, convey energy and freedom, and drive registration — replacing the current text-only layout with a visually rich, conversion-optimized page. Content centered with constrained max-width to avoid sparse feel.

## Design Decisions

- **Layout:** Split screen hero (text left, logo illustration right), centered content sections below
- **Visual style:** Energie & Liberte — dynamic, vivid, spontaneous
- **Illustrations:** Project logo (sun+heart SVG) used as hero illustration + floating trust badges around it
- **Colors:** No dark/black bands — blush (#FDF0ED), sand (#F5E6D8), white, coral accents
- **Borders:** Zero gray borders/contours — cards use soft box-shadows only
- **Hero background:** Stock photo with blur + semi-transparent blush overlay
- **Content width:** Centered with `max-w-2xl` / `mx-auto` to keep density and avoid sparse layout
- **Logo:** Present in nav bar and hero illustration (project's own Logo component / SVG)

## Sections (top to bottom)

### 0. Nav bar
- Left: Logo component (SVG icon + "Libre" text in coral)
- Right: "Se connecter" text link + "Creer un compte" coral pill button
- Background: transparent (over hero blur)

### 1. Hero (split screen)
- **Left:** "Libre" in coral as large title, tagline "Parce que rencontrer ne devrait rien couter.", description "Rencontre gratuite. Sans abonnement. Sans microtransaction. Sans revente de donnees. Parce que quand c'est gratuit, tout le monde est la.", two CTA buttons ("Creer un compte gratuitement" solid terracotta, "Se connecter" white semi-transparent)
- **Right:** Large logo SVG (semi-transparent, decorative) with 3 floating trust badges positioned around it ("Chiffre E2E", "Badge verifie", "Moderation") — white pill badges with coral text + soft shadow
- **Background:** Stock photo (Unsplash) with `blur(6px) brightness(1.15)` + gradient overlay `rgba(253,240,237,0.9)` to `rgba(245,230,216,0.85)`
- **Mobile:** Stacks vertically (text above, illustration below)

### 2. Chiffres
- Background: blush
- 3 centered columns with `max-w-lg mx-auto`
- "~240 EUR / Cout annuel moyen d'un abonnement dating"
- "47% / Des abonnes regrettent leur achat / UFC-Que Choisir, 2025"
- "0 EUR / Chez Libre. Pour toujours." (coral highlight)

### 3. Constat
- Background: white
- Title: "Les apps de rencontre font payer l'espoir"
- 4 cards in 2x2 grid, `max-w-md mx-auto`, blush background, rounded corners, soft box-shadow (no borders)
  - "Likes limites sans abonnement / Swipes brides, fonctionnalites verrouillees — la version gratuite pousse a payer."
  - "Microtransactions a chaque action / Super Like a 5EUR, Boost a l'unite... Le cout reel depasse vite l'abonnement."
  - "Prix variables selon votre profil / Deux personnes voisient des prix differents pour le meme abonnement."
  - "Renouvellement automatique piege / On s'abonne un mois, on oublie d'annuler, les prelevements continuent."

### 4. Argument Libre
- Background: sand
- Title: "Gratuit = plus de celibataires = plus de chances"
- Paragraph: "Pas de barriere financiere, pas de fonctionnalite verrouillee, pas de boost a acheter. Tout le monde a acces a tout."
- 3 cards in row, `max-w-md mx-auto`, white background, rounded corners, soft box-shadow
  - "Croisements en chemin / Decouvrez les celibataires que vous croisez au quotidien"
  - "Chat chiffre E2E / Le serveur ne lit jamais vos messages"
  - "Moderation communautaire / Signalement, blocage, badge verifie"
- Subtext: "Le chat n'est pas le produit. C'est le pont vers de vraies rencontres. Une fois le contact etabli, a vous de choisir comment aller plus loin."

### 5. Vie privee
- Background: blush
- Title: "Votre vie privee n'est pas un produit"
- 4 cards in 2x2 grid, `max-w-sm mx-auto`, white background, rounded corners, soft box-shadow
  - "Chiffrement E2E / Le serveur ne lit jamais vos messages" + lock icon
  - "Zero revente / Vos donnees ne sont jamais vendues" + shield icon
  - "Badge verifie / Photos verifiees par selfie" + checkmark icon
  - "Moderation / Signalement et blocage communautaire" + people icon
- Icons: emoji or inline SVG

### 6. CTA final
- Background: gradient coral to terracotta
- Title: "0EUR. Pas d'abonnement. Pas de pieges."
- Subtext: "Rejoignez ceux qui refusent de payer pour esperer."
- Button: white pill, coral text, "Creer un compte"

### 7. Footer
- Centered mini-logo (small SVG + "Libre" in faded coral)
- CGU link below
- No border-top

## Technical Notes

- Stock photo: served from Unsplash CDN via `next/image` with `remotePatterns` already configured
- Logo: reuse existing `Logo.tsx` component for nav, inline SVG for hero illustration
- SVG floating badges: positioned with `absolute` around the hero logo
- Dark mode: existing `dark:` variants — blush → dark equivalent, sand → dark equivalent, white → dark bg
- Mobile: hero stacks vertically, grid cards collapse to single column
- All text content preserved from current page (just restructured + centered)
- JSON-LD SoftwareApplication schema stays
- Centered sections: use `mx-auto max-w-2xl` (chiffres, constat) or `mx-auto max-w-md` (features, privacy) for density

## Out of Scope

- Dynamic content (user counts, live testimonials)
- A/B testing infrastructure
- App store badges / QR code (web app, not native)