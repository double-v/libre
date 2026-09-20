# Tasks: Ville saisie à la main, repli de la géolocalisation

**Input**: `specs/004-ville-manuelle/` — plan.md, spec.md, research.md,
data-model.md, contracts/, quickstart.md

**Tests**: la constitution impose le TDD (« la logique, en TDD ») : chaque
brique logique a sa tâche de test **avant** son implémentation. Les tâches UI
ont un gate pixel, pas un test de classes.

**Organization**: par user story, pour que chacune soit livrable et testable
seule. Livraison en **PR de lot** (préférence opérateur, cf. #397) : une PR
`feat/402-ville-manuelle` qui ferme les trois issues de story.

## Format: `[ID] [P?] [Story] Description`

- **[P]** : parallélisable (fichiers différents, sans dépendance en attente)
- **[USn]** : user story de spec.md

## Path Conventions

Dépôt plat Next.js : `src/app/api/**/route.ts`, `src/lib/`, `src/components/`,
tests colocalisés en `__tests__/`. Voir plan.md « Source Code ».

---

## Phase 1: Setup

**Purpose**: environnement du worktree et gate visuel préparés.

- [x] T001 Vérifier l'environnement du worktree `feat-402-ville-manuelle` : `node_modules` (cp -al), `.env`, `npx prisma generate`, `npx vitest run` vert au départ (baseline)
- [x] T002 [P] Publier sur proto-server un prototype HTML statique de `CityPicker` + carte position (profil et invite Découvrir ; 390 px et 1080 px ; clair et sombre ; thème `libre`) avec les tokens de `src/app/globals.css`, et obtenir la validation opérateur **avant** T014

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: schéma, géocodage et garantie de non-fuite — tout ce dont les
trois stories dépendent.

**⚠️ CRITICAL**: aucune story ne commence avant la fin de cette phase.

- [x] T003 Ajouter `positionSource String? @map("position_source")` et `cityLabel String? @map("city_label")` au modèle `Profile` dans `prisma/schema.prisma` (commentaire : privés, jamais sérialisés vers autrui)
- [x] T004 Écrire à la main `prisma/migrations/20260920120000_profile_city_fallback/migration.sql` (2 `ALTER TABLE "profiles" ADD COLUMN … TEXT`, additif, nullable) puis `npx prisma generate` — **jamais** `migrate dev`
- [x] T005 [P] Test rouge `src/lib/__tests__/geocoding.test.ts` : normalisation d'un `FeatureCollection` IGN (`context` → `qualifier` « 93, Seine-Saint-Denis », `country` « France »), d'une réponse Photon (`state`/`country`, exclusion `France`), fusion France d'abord, dédoublonnage `(label, qualifier, country)`, plafond 5, `formatCityLabel` (« Lyon (69) » / « Bruxelles, Belgique »), et `searchCities` avec `fetch` mocké : un service en échec → résultats de l'autre, deux en échec → `throw GeocodingUnavailable`
- [x] T006 Implémenter `src/lib/geocoding.ts` : `CityCandidate`, `parseIgn`, `parsePhoton`, `mergeCandidates`, `formatCityLabel`, `searchCities(q, fetchImpl)` (`Promise.allSettled`, timeout 4 s via `AbortSignal.timeout`, `next: { revalidate: 86400 }`) — vert sur T005
- [x] T007 [P] Ajouter `cities: { limit: 30, windowMs: 60_000 }` à `limits` dans `src/lib/rate-limit-upstash.ts` (et miroir si `src/lib/rate-limit.ts` en a un)
- [x] T008 Test rouge `src/__tests__/city-label-never-leaks.test.ts` : monter `GET /api/users/[id]`, `GET /api/discover`, `GET /api/geoloc/nearby`, `GET /api/geoloc/crossings`, `GET /api/matches` avec un `fakeDb` dont les profils portent `cityLabel: 'SENTINELLE-VILLE'` et `positionSource: 'city'` ; la réponse sérialisée ne contient ni la sentinelle ni `positionSource` (même méthode que #328) — doit être **vert dès l'écriture** (les routes utilisent des `select` explicites) et le rester
- [x] T009 [P] Test rouge `src/lib/push/__tests__/server.test.ts` (ajout) : `buildPayload` avec un profil portant `cityLabel` → la charge utile sérialisée ne le contient pas

**Checkpoint**: T005/T006/T008/T009 verts, `npx tsc --noEmit` OK.

---

## Phase 3: User Story 1 — Indiquer sa ville depuis son profil (Priority: P1) 🎯 MVP

**Goal**: choisir sa ville dans le profil ; « À proximité », filtre de distance
et croisements marchent comme avec la géoloc ; le nom de ville reste privé.

**Independent Test**: compte sans position → profil → choisir « Saint-Denis (93) »
→ carte « Ta ville : Saint-Denis (93) » ; `/discover` « À proximité » trié par
distance ; un autre compte ne voit jamais le nom (quickstart §1 et §4).

### Tests for User Story 1

- [x] T010 [P] [US1] Test rouge `src/app/api/geoloc/__tests__/cities-route.test.ts` : 401 sans session ; `q` < 3 → `{ cities: [] }` sans appel sortant ; `q` > 80 → 400 ; 429 quand `rateLimit` refuse ; 503 `geocoding_unavailable` quand `searchCities` lève ; 200 avec les candidats sinon
- [x] T011 [P] [US1] Test rouge `src/app/api/users/profile/__tests__/profile-city.test.ts` : `PUT { city: {…} }` → `update` reçoit `lastKnownLat/Lng` arrondis 2 décimales, `lastGeolocAt` non nul, `positionSource: 'city'`, `cityLabel` formaté ≤ 80 ; `PUT { city: null }` → `(0, 0)`, `lastGeolocAt: null`, source et libellé `null` ; `PUT` sans `city` → aucun de ces champs dans `update` ; `lat` hors `[-90, 90]` → 400 ; `GET` renvoie `positionSource` et `cityLabel`
- [x] T012 [P] [US1] Test (ajout) `src/app/api/geoloc/__tests__/geoloc-privacy.test.ts` : un update accepté écrit `positionSource: 'device'` et `cityLabel: null` dans l'`upsert`

### Implementation for User Story 1

- [x] T013 [US1] Créer `src/app/api/geoloc/cities/route.ts` (session, zod `q`, `rateLimit('cities:<userId>')`, `searchCities`, mapping d'erreurs du contrat `contracts/cities-search.md`) — vert sur T010
- [x] T014 [US1] Étendre `profileUpdateSchema` dans `src/lib/validators.ts` avec `city: z.object({ label, qualifier, country, lat, lng }).nullable().optional()` (bornes du contrat `contracts/profile-city.md`)
- [x] T015 [US1] Étendre `PUT` dans `src/app/api/users/profile/route.ts` : traduire `city` en écritures de position/source/libellé (`round2`, `formatCityLabel`), retrait sur `null`, absent = intouché ; `GET` expose `positionSource` et `cityLabel` (déjà `profile: true`, vérifier) — vert sur T011
- [x] T016 [US1] Ajouter `positionSource: 'device', cityLabel: null` aux branches `update` et `create` de l'`upsert` dans `src/app/api/geoloc/update/route.ts` — vert sur T012
- [x] T017 [US1] Créer `src/components/ui/CityPicker.tsx` (après validation du prototype T002) : `Input` existant + liste de propositions (`role="listbox"`, navigation clavier ↑↓⏎⎋, cibles ≥ 44 px, focus ring coral, `prefers-reduced-motion`), débounce 300 ms, min 3 caractères, états chargement / vide (« Aucune ville ne correspond — essaie avec le code postal ou le pays ») / 503 (« Réessaie dans un instant ») ; `onSelect(candidate)`, `onClear()`
- [x] T018 [US1] Créer `src/components/ProfilePositionCard.tsx` : lit `positionSource`/`cityLabel`, affiche « Ta ville : X » / « Position de ton appareil » / « Aucune position », mention si `invisibleMode` (« ta position n'est pas utilisée tant que le mode invisible est actif »), intègre `CityPicker` et les actions « Changer » / « Retirer » (PUT `city`)
- [x] T019 [US1] Intégrer `ProfilePositionCard` dans `src/app/(main)/profile/page.tsx` (section dédiée, largeur `app`, sans nouvelle DA) ; recharger le profil après PUT
- [x] T020 [US1] Documenter `CityPicker` et la carte position dans `DESIGN.md` (section Components DS : anatomie, états, copie, a11y)

**Checkpoint**: quickstart §1 et §4 rejoués sur l'app servie en local (DB
locale migrée) ; captures 390/1080 px clair/sombre.

---

## Phase 4: User Story 2 — Être invitée à saisir sa ville quand la géoloc échoue (Priority: P2)

**Goal**: sur Découvrir, chaque échec de géoloc (et l'absence de support) est
suivi de « Ou indique ta ville » ; le choix recharge le feed.

**Independent Test**: forcer un échec géoloc sur `/discover` → invite présente
sous le message → choisir une ville → feed avec distances (quickstart §2).

### Tests for User Story 2

- [x] T021 [P] [US2] Test (ajout) `src/lib/__tests__/geoloc-client.test.ts` : `geolocFallbackPrompt(kind)` renvoie la copie « Ou indique ta ville » pour les 4 échecs (`denied`, `unavailable`, `timeout`, `unsupported`) et pour le cas invisible → `null` (la ville n'aiderait pas)

### Implementation for User Story 2

- [x] T022 [US2] Ajouter `geolocFallbackPrompt` à `src/lib/geoloc-client.ts` — vert sur T021
- [x] T023 [US2] Dans `src/app/(main)/discover/page.tsx` : après `setGeoError(...)` (les deux blocs `geoloc_required`), rendre `CityPicker` sous le message quand `geolocFallbackPrompt` est non nul ; `onSelect` → `PUT /api/users/profile { city }` puis `fetchPage(true)` ; quand `navigator.geolocation` est absent, afficher l'invite d'emblée
- [x] T024 [US2] Copie : le bouton « Activer ma géolocalisation » reste premier ; l'invite est un second choix visuellement secondaire (`text-muted`, pas de nouvelle couleur)

**Checkpoint**: quickstart §2 rejoué (Chromium `--deny-permission-prompts` et
Sensors « unavailable ») ; captures.

---

## Phase 5: User Story 3 — Changer, retirer, laisser la géoloc reprendre (Priority: P3)

**Goal**: remplacer/retirer sa ville sans délai ; une géoloc réussie reprend la
main et le profil le dit.

**Independent Test**: quickstart §3 (remplacer → immédiat ; retirer → « Aucune
position » ; géoloc → « Position de ton appareil »).

### Tests for User Story 3

- [x] T025 [P] [US3] Test (ajout) `src/app/api/users/profile/__tests__/profile-city.test.ts` : deux `PUT { city }` successifs à 1 s d'intervalle sont tous deux écrits (aucun throttle) ; `PUT { city: null }` après une position `device` remet bien `(0, 0)` et `positionSource: null`
- [x] T026 [P] [US3] Test composant `src/components/__tests__/ProfilePositionCard.test.tsx` (Testing Library) : les trois états de source rendent la bonne phrase ; « Retirer » n'apparaît que pour `city` ; mention invisible conditionnelle

### Implementation for User Story 3

- [x] T027 [US3] Câbler « Changer » (ré-ouvre `CityPicker` pré-vidé) et « Retirer » (PUT `city: null`, puis état « Aucune position ») dans `src/components/ProfilePositionCard.tsx` — vert sur T026
- [x] T028 [US3] (sans objet : /profile recharge le profil au montage) Dans `src/app/(main)/discover/page.tsx`, après un `POST /api/geoloc/update` accepté, invalider le profil chargé (`/api/users/profile`) pour que la carte du profil affiche « Position de ton appareil » sans rechargement manuel

**Checkpoint**: quickstart §3 rejoué ; captures.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T029 [P] Mettre à jour `CLAUDE.md` (section Sécurité : « ville saisie à la main : libellé et source privés, test `city-label-never-leaks` ») et `PRODUCT.md` si la section « À proximité » décrit la géoloc comme seule source
- [x] T030 [P] Vérifier `src/app/api/users/me/export/route.ts` : l'export RGPD inclut `cityLabel`/`positionSource` (c'est à la membre) — ajouter un `it` si un test d'export existe
- [x] T031 Gates locaux complets (CI GitHub sans quota) : `npx vitest run`, `npx tsc --noEmit`, `npx eslint .`, puis captures Playwright (chromium en cache) de `/profile` et `/discover` en 390 px et 1080 px, clair et sombre, jointes à la PR
- [ ] T032 Ouvrir la PR `feat/402-ville-manuelle` **en brouillon** dès le premier push, base `fix/401-floutage-client` (empilée), corps avec `Closes #402` + `Closes` des trois issues de story ; passer `ready` seulement après T031

---

## Dependencies & Execution Order

- **Phase 1 → 2 → 3 → 4 → 5 → 6**, les stories dans l'ordre de priorité.
- US2 dépend de US1 (`CityPicker`, route `cities`, PUT `city`). US3 dépend de
  US1 (carte position). US2 et US3 sont indépendantes entre elles.
- T002 (prototype) doit être **validé** avant T017 ; les tâches serveur (T010–T016)
  n'attendent pas la validation visuelle.

### Parallel opportunities

- Phase 2 : T005 ∥ T007 ∥ T008 ∥ T009 (fichiers distincts) ; T003→T004→T006 en
  série.
- US1 : T010 ∥ T011 ∥ T012 (tests), puis T013 ∥ T014 ; T017 ∥ T018 après
  validation du prototype.
- US2 et US3 peuvent être menées en parallèle après US1.

## Implementation Strategy

- **MVP = Phase 1 + 2 + US1** : une membre sans géoloc existe pour les autres.
  Livrable seul si besoin.
- Puis US2 (l'invite au bon moment) et US3 (cohérence dans le temps), dans la
  même PR de lot sauf demande contraire de l'opérateur.
- À chaque checkpoint : gates locaux + pixels réels, jamais « CI verte » comme
  preuve (la CI est de toute façon hors quota).
