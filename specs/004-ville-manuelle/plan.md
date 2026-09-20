# Implementation Plan: Ville saisie à la main, repli de la géolocalisation

**Branch**: `feat/402-ville-manuelle` | **Date**: 2026-09-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-ville-manuelle/spec.md`

## Summary

Une membre sans géolocalisation choisit sa ville (profil, ou invite sur
Découvrir à l'échec de la géoloc). Le serveur géocode la ville et écrit la
**même** position que la géoloc automatique (`lastKnownLat/Lng` arrondis,
`lastGeolocAt`), plus deux champs privés : la **source** de la position et le
**libellé** de la ville, jamais sérialisés vers d'autres membres. Découvrir,
le filtre de distance et les croisements ne changent pas d'une ligne.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16 App Router, React 19

**Primary Dependencies**: Prisma 7 (`@prisma/adapter-pg`), zod (validators),
`@upstash/ratelimit`, `fetch` natif côté serveur pour le géocodage

**Storage**: PostgreSQL/Neon — 2 colonnes nullables ajoutées à `profiles`
(migration additive écrite à la main)

**Testing**: Vitest (routes mockées via `fakeDb`, lib pure), Playwright pour
le gate visuel

**Target Platform**: web (PWA mobile-first, desktop 1080 px)

**Project Type**: web-service + front dans le même dépôt Next.js

**Performance Goals**: propositions de villes < 1 s perçue (débounce 300 ms +
2 appels sortants en parallèle, cache serveur 24 h par requête)

**Constraints**: aucune clé d'API, services publics gratuits ; le nom de ville
ne sort d'aucune route lue par un autre membre ; pas de `migrate dev`

**Scale/Scope**: quelques dizaines de comptes au lancement ; 1 route API
nouvelle, 1 route existante étendue, 2 surfaces UI (profil, Découvrir), 1
composant DS nouveau (`CityPicker`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Statut | Comment |
|---|---|---|
| I. Humain d'abord | ✅ | Repli d'accès, aucun ressort d'engagement ; permet à des membres d'exister pour les autres. |
| II. Français, copie inclusive | ✅ | Copie définie dans la spec (« Ta ville », « près de toi ») ; aucun anglicisme. |
| III. Vie privée = invariant | ✅ | Précision inchangée (2 décimales) ; libellé et source **privés** ; test de non-régression par route qui sérialise le profil (SC-003), même méthode que #328. Fermeture par défaut : la position n'est écrite qu'après géocodage réussi. |
| IV. Design System | ✅ avec proposition | `CityPicker` (champ + liste de propositions) n'existe pas dans `src/components/ui/` → proposé dans `DESIGN.md` dans la même PR, bâti sur `Input` et les tokens existants. |
| V. Le pixel juge | ✅ | Prototype HTML (proto-server) validé avant code, puis capture Playwright sur l'app servie avant `ready`. |
| VI. Ticket = maille | ✅ | 3 user stories → 3 issues (#405, #406, #407), livrées dans une PR de lot (préférence opérateur, cf. #397). |
| Migrations additives à la main | ✅ | `20260920120000_profile_city_fallback` : 2 colonnes nullables. |
| Effets post-persist best-effort | ✅ | Aucun effet de bord (pas de push, pas de Pusher). Le géocodage est **avant** l'écriture, donc bloquant à juste titre. |

Gate : aucune violation. Pas de Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/004-ville-manuelle/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── cities-search.md      # GET /api/geoloc/cities
│   └── profile-city.md       # PUT /api/users/profile (extension) + GET (lecture privée)
└── tasks.md                  # /speckit-tasks
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                                   # Profile: positionSource, cityLabel
└── migrations/20260920120000_profile_city_fallback/migration.sql

src/lib/
├── geocoding.ts                                    # BAN/IGN + Photon → CityCandidate[], normalisation, dédoublonnage
├── geoloc-client.ts                                # (existant #400/#401) + copie « Ou indique ta ville »
├── validators.ts                                   # profileUpdateSchema: city {label, lat, lng} | null
└── __tests__/geocoding.test.ts

src/app/api/
├── geoloc/cities/route.ts                          # GET ?q= → propositions (rate-limited, cache 24 h)
├── geoloc/update/route.ts                          # écrit positionSource='device', cityLabel=null
└── users/profile/route.ts                          # PUT: city → lastKnownLat/Lng + source='city' ; GET: renvoie cityLabel/positionSource (soi-même)

src/components/
├── ui/CityPicker.tsx                               # champ + propositions, clavier/a11y, 44 px
└── ProfilePositionCard.tsx                         # « Ta ville : X » / « Position de ton appareil » / « Aucune position » + actions

src/app/(main)/
├── profile/page.tsx                                # intègre ProfilePositionCard
└── discover/page.tsx                               # invite « Ou indique ta ville » sous l'échec géoloc

src/__tests__/
└── city-label-never-leaks.test.ts                  # SC-003 : routes lues par autrui ne sérialisent ni cityLabel ni positionSource

DESIGN.md                                            # section CityPicker + carte position
```

**Structure Decision**: dépôt plat Next.js existant ; aucune nouvelle arborescence.
La logique de géocodage est isolée dans `src/lib/geocoding.ts` (pure, testable
avec `fetch` mocké) ; la route n'est qu'un adaptateur avec rate limit et cache.

## Phase 0 — research.md

Voir [research.md](research.md) : choix du géocodeur (IGN Géoplateforme +
Photon), stratégie de fusion France-d'abord, cache et limite de débit, précision
stockée, cohabitation avec le throttle de 10 min.

## Phase 1 — design

- [data-model.md](data-model.md) — deux champs, transitions de source.
- [contracts/](contracts/) — `GET /api/geoloc/cities`, extension de
  `PUT /api/users/profile`, lecture privée par `GET`.
- [quickstart.md](quickstart.md) — scénarios de validation locale (vitest,
  tsc, eslint, pixels), sans CI GitHub.

## Constitution Check — post-design

Inchangé : ✅ sur les 8 lignes. Le point IV (nouveau composant) est couvert par
l'ajout à `DESIGN.md` dans la même PR, et le point III par le test
`city-label-never-leaks.test.ts` qui échoue si une route lue par autrui
sérialise l'un des deux champs.
