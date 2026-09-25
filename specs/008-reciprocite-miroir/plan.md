# Implementation Plan: Réciprocité miroir — intention et distance

**Branch**: `feat/008-reciprocite-miroir` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-reciprocite-miroir/spec.md`

## Summary

« Tu vois ce que tu montres », sur deux champs. **Intention** : une règle pure
`canSeeIntention` (même famille que `canSeePractices`) décide, pour chaque
lectrice, si l'intention d'autrui sort de l'API ; trois routes l'appliquent
(fiche, « À proximité », Croisements) et le feed ignore le filtre d'intention
d'une lectrice non déclarée. La réponse voilée porte un marqueur
`relationshipTypeVeiled: true`, distinct d'une liste vide. Une nouvelle valeur
de taxonomie, « je verrai en chemin », lève le voile comme les autres.
**Distance** : aucune règle serveur nouvelle (déjà vraie de fait) ; une ligne
d'invitation unique en tête de « Pour toi » quand la lectrice n'a pas de
position et que la carte de relance ne montre pas déjà ce manque. Aucune
migration, aucune route nouvelle.

## Technical Context

**Language/Version**: TypeScript 5 / Next.js 16 App Router (React 19)

**Primary Dependencies**: Prisma 7 (`@prisma/adapter-pg`), NextAuth 4, Tailwind v4

**Storage**: PostgreSQL (Neon) — **aucune migration** : `relationshipType` est un `String[]` libre (validé ≤ 30 caractères) ; la nouvelle valeur entre par la taxonomie.

**Testing**: Vitest + Testing Library (CI) ; Playwright chromium en cache pour le gate visuel (local)

**Target Platform**: web mobile-first (PWA), desktop ≥ md

**Project Type**: application web (front + API dans le même dépôt Next.js)

**Performance Goals**: zéro requête supplémentaire sur la fiche et le feed (le profil lectrice y est déjà lu) ; **une** lecture `profile.findUnique` ajoutée dans Croisements (clé primaire).

**Constraints**: fermé par défaut (principe III) ; copie sans chiffre ni référence aux autres (FR-011) ; DS existant uniquement ; prototype validé avant de coder les deux invitations (principe V).

**Scale/Scope**: ~106 comptes ; 1 module de règle, 3 routes API + le feed, 4 composants touchés (ProfileModal, SearchFilters, discover page, taxonomie), 1 garde de non-fuite.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Vérification | État |
|---|---|---|
| I. L'humain d'abord | Rien n'est bloqué (FR-012) ; la réciprocité porte sur un champ d'honnêteté, pas sur l'exposition du corps ; « je verrai en chemin » évite de forcer une étiquette. | ✅ |
| II. Français, copie inclusive | Copies tutoyées, sans chiffre ni mention d'autres membres ; « je verrai en chemin » fait écho à « Croisements en chemin ». | ✅ |
| III. Vie privée | Voile appliqué **à la sérialisation** ; échec de lecture du profil lectrice → voilé ; filtre neutralisé côté serveur (anti-déduction) ; test de non-fuite **par route** (FR-014). Position : aucun changement. | ✅ |
| IV. Design System | Pas de composant de base nouveau : l'invitation d'intention réutilise le style des lignes de `ProfileModal`, celle de distance réutilise la ligne d'info existante du feed (`nearbyReason`) — à confirmer au prototype. | ✅ |
| V. Le pixel juge | Prototype des deux invitations (fiche + filtre + ligne de feed, clair/sombre, mobile/desktop) **à valider par l'opérateur avant T-UI**. | ⏳ gate avant implémentation UI |
| VI. Ticket = maille | 3 user stories → 3 issues ; un lot = une branche tampon = une PR (préférence opérateur). | ✅ |
| Migrations additives à la main | Aucune migration. | ✅ |
| Effets post-persist best-effort | Aucun effet de bord ajouté. | ✅ |

Aucune violation. Pas de Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/008-reciprocite-miroir/
├── plan.md              # ce fichier
├── research.md          # décisions de phase 0
├── data-model.md        # entités et règle de lecture
├── quickstart.md        # scénarios de validation
├── contracts/
│   ├── profile-intention.md   # forme des réponses (fiche, proximité, croisements)
│   └── discover-filter.md     # neutralisation du filtre + invitation distance
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/lib/
├── taxonomy.ts                  # + 'je verrai en chemin' dans RELATIONSHIP_TYPE_OPTIONS
└── profile-visibility.ts        # + hasDeclaredIntention, canSeeIntention, intentionFor

src/app/api/
├── users/[id]/route.ts          # voile sur la fiche (profil lectrice déjà lu : + relationshipType)
├── geoloc/nearby/route.ts       # voile (myProfile déjà lu)
├── geoloc/crossings/route.ts    # voile (+ lecture du profil lectrice)
└── discover/route.ts            # filtre d'intention ignoré si lectrice non déclarée (myProfile remonté avant le where)

src/components/
├── ProfileModal.tsx             # invitation à la place de l'intention voilée
└── SearchFilters.tsx            # filtre d'intention non utilisable + invitation

src/app/(main)/discover/page.tsx # ligne d'invitation distance, une fois, hors doublon carte de relance

src/__tests__/
└── intention-never-leaks.test.ts   # garde par route (même motif que city-label-never-leaks)
```

**Structure Decision**: application Next.js unique existante ; aucun dossier nouveau hors la spec.

## Complexity Tracking

Aucune violation à justifier.
