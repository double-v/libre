# Implementation Plan: Le premier quart d'heure — onboarding progressif

**Branch**: `feat/005-premier-quart-d-heure` | **Date**: 2026-09-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-premier-quart-d-heure/spec.md`

## Summary

Un nouvel inscrit ressort de sa première session avec un profil qui peut
être choisi : photo, ce qu'il cherche, position, et le push de match
accepté s'il le souhaite. Techniquement : un champ d'avancement sur `Profile`
(`onboardingStep`), une route `/bienvenue` en trois écrans qui réutilisent
les écritures existantes (photos, profil, géoloc, ville, push), une garde
côté Découvrir qui y envoie tant que le parcours n'est pas terminé, une carte
de relance dans la grille « Pour toi » (même mécanique que la carte de
parrainage), un tri « photo d'abord » du feed, et un rattrapage SQL des
comptes sans profil. Aucune nouvelle API d'écriture : le parcours est une
autre porte d'entrée sur des routes qui existent et sont déjà testées.

## Technical Context

**Language/Version**: TypeScript 5 / Next.js 16 App Router (React 19)

**Primary Dependencies**: Prisma 7 (`@prisma/adapter-pg`), NextAuth 4, Tailwind v4, web-push (spec 003), géocodage IGN/Photon (spec 004)

**Storage**: PostgreSQL (Neon) — une colonne additive `profiles.onboardingStep` + un backfill ; `localStorage` pour l'écartement de la carte de relance (par appareil, cf. Assumptions de la spec)

**Testing**: Vitest + Testing Library (unitaires/intégration, CI) ; Playwright chromium en cache pour le gate visuel (local)

**Target Platform**: web mobile-first (PWA installable), desktop ≥ md

**Project Type**: application web (front + API dans le même dépôt Next.js)

**Performance Goals**: le tri « photo d'abord » ne doit pas dégrader « Pour toi » : le chemin historique (curseur Prisma) charge PAGE_SIZE+1 lignes ; on ne bascule pas en tri mémoire sur ce chemin (voir research R4)

**Constraints**: charte (aucun nombre, aucune référence aux autres membres dans la relance et la proposition push) ; DS existant (SiteShell `app`, Card, Button, TagButton, CityPicker, ProfilePhotoHero) ; migration additive écrite à la main ; effets de bord best-effort

**Scale/Scope**: 82 comptes aujourd'hui, quelques centaines visés ; 1 route nouvelle (`/bienvenue`), 1 composant de carte, 1 colonne, 1 backfill, ~4 fichiers API touchés

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Vérification | État |
|---|---|---|
| I. L'humain d'abord | Le parcours est passable à chaque étape ; aucun compteur, aucune mention des autres membres (FR-015, FR-020) ; le seul événement notifié reste le match. Le tri « photo d'abord » ne masque personne (FR-022). | ✅ |
| II. Français, copie inclusive | Toute la copie du parcours et de la carte en français, tutoiement ; « Plus tard » plutôt que « Ignorer » ; « si ça matche » plutôt que « quand quelqu'un t'aime ». | ✅ |
| III. Vie privée | Position : mêmes routes et même floutage que spec 004 ; `cityLabel`/`positionSource` restent privés (garde `city-label-never-leaks`) ; `onboardingStep` n'est jamais sérialisé vers autrui (ajout à la garde). Push : même opt-in par appareil que spec 003. | ✅ |
| IV. Design System | Aucun nouveau composant de base : SiteShell `app`, Card, Button, TagButton, CityPicker, ProfilePhotoHero, GridFillerCards comme précédent de carte non-profil. Un composant *composite* `OnboardingStep` et une `ProfileNudgeCard` sont proposés dans `DESIGN.md` avant code. | ✅ (amendement DESIGN.md dans le lot) |
| V. Le pixel juge | Prototype **validé par l'opérateur le 2026-09-20** : `http://192.168.1.116:8101/getlibre/feat-005-premier-quart-d-heure/bienvenue.html` (4 écrans + carte de relance, clair/sombre, 420/1080). Choix gravés : progression en 3 segments fins (pas de « 1 sur 3 »), tab bar masquée sur le parcours, SiteNav conservée. Captures sur l'app servie avant merge. | ✅ |
| VI. Ticket = maille | 4 user stories → 4 issues (#342 rattrapé, #135, nouvelle push-onboarding, #343) ; lot = 1 branche tampon = 1 PR selon la préférence opérateur (mémoire « branche tampon par lot »). | ✅ |
| Migrations additives à la main | `ALTER TABLE profiles ADD COLUMN "onboardingStep" INTEGER NOT NULL DEFAULT 0` + backfill dans la même migration. | ✅ |
| Effets post-persist best-effort | Le parcours n'ajoute aucun effet de bord ; l'abonnement push suit déjà la règle. | ✅ |

Aucune violation. Pas de Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/005-premier-quart-d-heure/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── profile-onboarding.md     # champ onboardingStep : lecture, avancement, garde de fuite
│   └── discover-feed-order.md    # tri « photo d'abord » de « Pour toi »
└── tasks.md                      # /speckit-tasks
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                                   # Profile.onboardingStep
└── migrations/2026MMDD…_onboarding_step/migration.sql   # colonne + backfill + profils orphelins

src/app/(main)/
├── bienvenue/page.tsx                              # NOUVEAU — le parcours (3 étapes + push)
├── discover/page.tsx                               # garde → /bienvenue ; ProfileNudgeCard dans la grille
└── layout.tsx                                      # tab bar masquée sur /bienvenue (une condition)

src/app/api/
├── users/profile/route.ts                          # accepte onboardingStep (whitelist), expose-le à la membre seule
├── discover/route.ts                               # tri photo d'abord (chemins « all » sans distance, « all » + distance)
└── users/[id]/route.ts                             # ne sérialise JAMAIS onboardingStep (garde)

src/components/
├── onboarding/
│   ├── OnboardingShell.tsx                         # cadre commun : titre, progression discrète, « Plus tard »
│   ├── StepPhoto.tsx                               # réutilise l'upload de ProfilePhotoHero / POST /api/users/photos
│   ├── StepSeeking.tsx                             # TagButton × RELATIONSHIP_TYPE_OPTIONS, GENDER_OPTIONS, ORIENTATION_OPTIONS
│   ├── StepPosition.tsx                            # useGeolocation + CityPicker (defaultSaveCity)
│   └── StepPush.tsx                                # getPushSupport / enablePush (spec 003)
├── ProfileNudgeCard.tsx                            # carte de relance dans la grille Découvrir
└── ProfilePositionCard.tsx                         # ancre profile-section-position

src/lib/
├── onboarding.ts                                   # étapes, dérivation « quoi manque », règle FR-011/FR-023
└── validators.ts                                   # onboardingStep: z.number().int().min(0).max(3)

src/__tests__/
├── onboarding-step-never-leaks.test.ts             # même approche que city-label-never-leaks
└── …
src/components/onboarding/__tests__/                # chaque étape : saisie, « Plus tard », erreur
src/app/api/discover/__tests__/discover-photo-first.test.ts
src/lib/__tests__/onboarding.test.ts
DESIGN.md                                           # section « Parcours d'accueil » + « Carte de relance »
```

**Structure Decision**: application Next.js unique, comme les specs
précédentes. Le parcours vit sous `(main)` pour hériter du shell connecté
(SiteNav authed, tab bar masquée sur cette route — voir research R2), pas
sous `(auth)` : on est déjà connecté quand on y arrive.

## Phase 0 — voir [research.md](./research.md)

## Phase 1 — voir [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

## Constitution Check — après conception

Reconfirmé après Phase 1 : aucun nouveau composant de base, aucune nouvelle
API d'écriture, une colonne additive, aucune donnée nouvelle exposée aux
autres membres (garde de fuite ajoutée), aucun événement notifié nouveau.
Les deux points qui pouvaient déraper — le tri du feed et la sollicitation
push — sont bornés par FR-022 (ne masque personne) et FR-013/FR-016 (une
fois, en fin de parcours, appareil compatible seulement).
