# Tasks: Le premier quart d'heure — onboarding progressif

**Input**: `specs/005-premier-quart-d-heure/` — plan.md, spec.md, research.md,
data-model.md, contracts/, quickstart.md

**Tests**: la constitution impose le TDD (« la logique, en TDD ») : chaque
brique logique a sa tâche de test **avant** son implémentation. Les tâches UI
reproduisent le prototype validé et passent un gate pixel, pas un test de
classes.

**Organization**: par user story, chacune livrable et testable seule.
Livraison en **PR de lot** (préférence opérateur, cf. #397) : une branche
`feat/005-premier-quart-d-heure`, une PR qui ferme les quatre issues de story
(#342, #135, #411, #343).

**Prototype validé** (2026-09-20) :
`http://192.168.1.116:8101/getlibre/feat-005-premier-quart-d-heure/bienvenue.html`
— à reproduire, pas à réinterpréter.

## Format: `[ID] [P?] [Story] Description`

- **[P]** : parallélisable (fichiers différents, sans dépendance en attente)
- **[USn]** : user story de spec.md

## Path Conventions

Dépôt plat Next.js : `src/app/api/**/route.ts`, `src/lib/`, `src/components/`,
tests colocalisés en `__tests__/`. Voir plan.md « Source Code ».

---

## Phase 1: Setup

**Purpose**: environnement du worktree, issues du lot, gate visuel acquis.

- [x] T001 Créer le worktree `/home/w/projects/.worktrees/getlibre/feat-005-premier-quart-d-heure` depuis `libre/main` ; `.env` copié, `node_modules` en liens durs (`cp -al`), `npx prisma generate`, `npx vitest run` vert au départ (baseline)
- [x] T002 [P] Ouvrir l'issue GitHub « feat: proposer le push de match en fin de parcours d'accueil » (US3) sur `double-v/libre`, corps = US3 de spec.md + lien spec ; noter son numéro dans ce fichier et dans le corps de PR à venir
- [x] T003 [P] Amender `DESIGN.md` : section « Parcours d'accueil » (`/bienvenue` : SiteShell `app`, progression 3 segments fins, titre `text-2xl font-bold`, `lead` `text-muted`, actions empilées primary + ghost « Plus tard », tab bar masquée) et « Carte de relance » (première cellule de la grille Découvrir, silhouette `ProfileCard`, fond `bg-sunken`, eyebrow « Ton profil », aucun nombre) — référence au prototype validé

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: la colonne d'avancement, sa non-fuite, et les règles pures dont
les quatre stories dépendent.

**⚠️ CRITICAL**: aucune story ne commence avant la fin de cette phase.

- [x] T004 Ajouter `onboardingStep Int @default(0)` au modèle `Profile` dans `prisma/schema.prisma` (commentaire : 0 photo · 1 cherche · 2 où · 3 terminé ; privé, jamais sérialisé vers autrui ; monotone)
- [x] T005 Écrire à la main `prisma/migrations/20260921120000_onboarding_step/migration.sql` avec les trois blocs de data-model.md : `ALTER TABLE "profiles" ADD COLUMN "onboardingStep" INTEGER NOT NULL DEFAULT 0` ; `INSERT INTO "profiles" ("userId") SELECT u.id FROM "users" u LEFT JOIN "profiles" p ON p."userId" = u.id WHERE p."userId" IS NULL` (tous les autres champs ont un défaut ou sont nullables — vérifier `orientation`, `relationshipType`, `interests`, `photos` : `String[]` sans `@default` ⇒ préciser `'{}'` explicitement) ; `UPDATE … SET "onboardingStep" = 3 WHERE "onboardingStep" = 0 AND (cardinality("photos") > 0 OR cardinality("relationshipType") > 0 OR "last_geoloc_at" IS NOT NULL OR "city_label" IS NOT NULL)` ; puis `npx prisma generate` — **jamais** `migrate dev`
- [x] T006 [P] Test rouge `src/lib/__tests__/onboarding.test.ts` : `deriveMissing(profile)` renvoie `'photo'` si `photos` vide, sinon `'seeking'` si `relationshipType` vide, sinon `'position'` si `lastGeolocAt` et `cityLabel` nuls, sinon `null` ; `mustOnboard(profile)` vrai ssi `onboardingStep < 3` et faux pour `profile = null` ⇒ vrai (traité comme 0) ; `nextStep(current, requested)` = `max` ; `NUDGE_COPY[kind]` ne contient aucun chiffre (regex `/\d/`) ni les mots « personnes », « membres », « likes »
- [x] T007 Implémenter `src/lib/onboarding.ts` : `ONBOARDING_DONE = 3`, `type MissingKind`, `deriveMissing`, `mustOnboard`, `nextStep`, `NUDGE_COPY` (copie du contrat profile-onboarding.md, liens `/profile#profile-section-photos|orientation|position`), constantes `NUDGE_DISMISS_KEY = 'libre:nudge-dismissed'`, `PUSH_ASKED_KEY = 'libre:push-asked'`, `NUDGE_DISMISS_DAYS = 7` — vert sur T006
- [x] T008 [P] Ajouter `onboardingStep: z.number().int().min(0).max(ONBOARDING_DONE).optional()` au schéma de `PUT profile` dans `src/lib/validators.ts`
- [x] T009 Test rouge `src/app/api/users/profile/__tests__/onboarding-step.test.ts` : `PUT { onboardingStep: 2 }` sur un profil à 1 → 2 ; `PUT { onboardingStep: 1 }` sur un profil à 2 → reste 2 (jamais de recul) ; `PUT { onboardingStep: 4 }` → 400 ; `GET` renvoie `onboardingStep` à la membre
- [x] T010 Implémenter dans `src/app/api/users/profile/route.ts` : whitelist `onboardingStep` avec `nextStep(actuel, demandé)` (lecture du profil courant avant `upsert`, ou `GREATEST` si le route fait déjà un `findUnique`) — vert sur T009
- [x] T011 [P] Test `src/__tests__/onboarding-step-never-leaks.test.ts` (calqué sur `city-label-never-leaks.test.ts`) : `fakeDb` dont les profils portent `onboardingStep: 1` ; monter `GET /api/users/[id]`, `GET /api/discover`, `GET /api/geoloc/nearby`, `GET /api/geoloc/crossings`, `GET /api/matches` et `buildPayload` push ; aucune réponse sérialisée ne contient `onboardingStep` — doit être **vert dès l'écriture** et le rester

**Checkpoint**: T006/T009/T011 verts, `npx tsc --noEmit` OK, migration relue.

---

## Phase 3: User Story 1 — Exister dès l'inscription (Priority: P1) 🎯 MVP

**Goal**: aucun compte sans profil ; un profil sans date de naissance reste
visible ; les profils avec photo passent d'abord dans « Pour toi ». Ferme **#342**.

**Independent Test**: après migration sur base locale, `SELECT count(*) FROM
users u LEFT JOIN profiles p … WHERE p."userId" IS NULL` = 0 ; un compte tout
juste créé apparaît dans « Pour toi » d'un autre compte, en bas ; les trois
profils avec photo précèdent les trois sans, quelle que soit l'activité.

### Tests for User Story 1

- [x] T012 [P] [US1] Test rouge `src/app/api/discover/__tests__/discover-photo-first.test.ts` (base du fichier `discover-distance-filter.test.ts`) : les quatre cas du contrat `discover-feed-order.md` — photo avant sans photo malgré `lastActive` plus ancien ; à photo égale, activité récente d'abord ; page 2 via `nextCursor` sans doublon et dans le même ordre (mettre 25 profils, PAGE_SIZE = 20) ; aucun profil sans photo absent de l'union des pages ; sur les deux chemins `tab=all` (sans et avec `distance=50` + profil géolocalisé)
- [x] T013 [P] [US1] Test rouge `src/app/api/auth/register/__tests__/register-creates-profile.test.ts` (ou ajout au test existant) : `user.create` est appelé avec `profile.create` — garde de non-régression de #342 (déjà vrai depuis #375, à verrouiller)

### Implementation for User Story 1

- [x] T014 [US1] Refondre les deux chemins `tab === 'all'` de `src/app/api/discover/route.ts` sur `paginateSorted` : `findMany` sur `baseWhere` (+ `geoWhere` si distance), tri `(hasPhoto desc, lastActive desc, userId asc)`, `sortValue = (hasPhoto ? 2 ** 53 : 0) + lastActive` ; supprimer le curseur Prisma sur ce chemin ; commentaire « limite connue » du contrat — vert sur T012
- [x] T015 [US1] Vérifier FR-003 dans `src/app/api/discover/route.ts` : la clause `birthDate` n'est posée que si `ageMin > 18 || ageMax < 99` (déjà le cas) ; ajouter un `it` dans T012 qui le prouve (profil sans `birthDate` présent sans filtre d'âge)

**Checkpoint**: T012/T013 verts ; sur base locale clonée + migration : 0 compte sans profil (quickstart S1, S7).

---

## Phase 4: User Story 2 — Un premier quart d'heure guidé (Priority: P1)

**Goal**: `/bienvenue` en trois étapes passables, entrée par la garde de
Découvrir, reprise à l'étape en cours, jamais représenté une fois à 3. Ferme **#135**.

**Independent Test**: quickstart S2, S3, S4 sur l'app servie (base locale).

### Tests for User Story 2

- [ ] T016 [P] [US2] Test rouge `src/components/onboarding/__tests__/OnboardingShell.test.tsx` : rend le titre, le lead, 3 segments (`aria-hidden`, classe `on`/`done` selon `step`), un bouton « Plus tard » toujours présent et jamais `disabled`, et `onLater` appelé au clic
- [ ] T017 [P] [US2] Test rouge `src/components/onboarding/__tests__/StepPhoto.test.tsx` : affiche la zone d'ajout ; après un `POST /api/users/photos` mocké en succès, affiche l'aperçu « Ajoutée » et « Continuer » ; en échec 400 `{ error }`, affiche le message serveur et laisse « Réessayer » et « Plus tard » ; « Plus tard » appelle `onDone` sans requête photo
- [ ] T018 [P] [US2] Test rouge `src/components/onboarding/__tests__/StepSeeking.test.tsx` : puces des trois groupes depuis `RELATIONSHIP_TYPE_OPTIONS`, `GENDER_OPTIONS` (sans `''`), `ORIENTATION_OPTIONS` ; « Continuer » appelle `onSave` avec `{ relationshipType, searchRelationshipTypes (= relationshipType), searchGenders, searchOrientations }` ; « Plus tard » appelle `onDone` sans `onSave`
- [ ] T019 [P] [US2] Test rouge `src/components/onboarding/__tests__/StepPosition.test.tsx` : « Utiliser ma position » appelle `requestDevicePosition` (injecté) puis `onDone` ; en échec `denied`, affiche le message de `geolocFailureMessage` et déplie le `CityPicker` ; un candidat choisi appelle `saveCity` (injecté, `defaultSaveCity` par défaut) puis `onDone` ; « Plus tard » → `onDone`
- [ ] T020 [P] [US2] Test rouge `src/app/(main)/discover/__tests__/onboarding-guard.test.tsx` : avec `GET /api/users/profile` mocké à `onboardingStep: 1`, `router.replace('/bienvenue')` est appelé avant le premier `fetch('/api/discover')` ; à `onboardingStep: 3`, pas de redirection ; à `profile: null`, redirection
- [ ] T021 [P] [US2] Test rouge `src/app/(main)/bienvenue/__tests__/page.test.tsx` : la page lit `GET /api/users/profile` et rend l'étape correspondant à `onboardingStep` (0 → photo, 1 → cherche, 2 → où) ; à 3, `router.replace('/discover')` ; chaque `onDone` fait `PUT /api/users/profile { onboardingStep: n+1 }` puis passe à l'étape suivante

### Implementation for User Story 2

- [ ] T022 [US2] Créer `src/components/onboarding/OnboardingShell.tsx` (SiteShell `app`, segments, eyebrow optionnel « Bienvenue, {prénom} », `h1`, lead, `children`, actions) — fidèle au prototype ; vert sur T016
- [ ] T023 [P] [US2] Créer `src/components/onboarding/StepPhoto.tsx` : extraire l'appel multipart de `src/app/(main)/profile/page.tsx:576` dans `src/lib/photos-client.ts` (`uploadPhoto(file): Promise<{ photos } | { error }>`) et l'utiliser ici comme dans le profil ; zone `bg-sunken` + avatar initiale + aperçu 4/5 ; vert sur T017
- [ ] T024 [P] [US2] Créer `src/components/onboarding/StepSeeking.tsx` avec `TagButton` × les trois taxonomies, libellés « Type de relation », « Qui veux-tu voir ? · facultatif », « Orientation · facultatif » ; vert sur T018
- [ ] T025 [P] [US2] Créer `src/components/onboarding/StepPosition.tsx` : deux cartes d'option (position de l'appareil via `navigator.geolocation` + `fuzzedPosition` + `POST /api/geoloc/update`, comme `discover/page.tsx:242` — factoriser dans `src/lib/geoloc-client.ts` si ce n'est pas déjà une fonction ; ville via `CityPicker` + `defaultSaveCity`), rappel de confidentialité avec cadenas ; vert sur T019
- [ ] T026 [US2] Créer `src/app/(main)/bienvenue/page.tsx` : client, charge le profil, résout l'étape, enchaîne Photo → Cherche → Où → (StepPush, US3) → `/discover` ; chaque passage écrit `PUT { onboardingStep }` **avant** d'afficher l'étape suivante ; erreur d'écriture → message + Réessayer, pas d'avancement ; vert sur T021
- [ ] T027 [US2] Garde dans `src/app/(main)/discover/page.tsx` : dans l'effet qui charge `/api/users/profile` pour les filtres, si `mustOnboard(profile)` → `router.replace('/bienvenue')` et ne pas lancer le feed ; vert sur T020
- [ ] T028 [US2] Masquer la tab bar dans `src/app/(main)/layout.tsx` quand `pathname.startsWith('/bienvenue')` (une condition, commentaire : tunnel court, SiteNav conservée) ; ajouter un `it` dans `src/app/(main)/__tests__/` si un test du layout existe

**Checkpoint**: T016–T021 verts ; quickstart S2/S3/S4 rejoués sur l'app servie ; captures 420 px clair/sombre des trois étapes.

---

## Phase 5: User Story 3 — Accepter d'être prévenu·e d'un match (Priority: P2)

**Goal**: la proposition push en fin de parcours, une fois par appareil,
appareil compatible seulement. Ferme **l'issue créée en T002**.

**Independent Test**: quickstart S5 (permission accordée → ligne dans
`push_subscriptions`, `/settings` reflète) ; « Plus tard » → rien en base,
`libre:push-asked` posé, pas de nouvelle proposition au rechargement.

### Tests for User Story 3

- [ ] T029 [P] [US3] Test rouge `src/components/onboarding/__tests__/StepPush.test.tsx` : avec `getPushSupport` mocké non supporté → rend `null` et appelle `onDone` immédiatement ; avec `getPushState` = `on` ou `denied` → idem ; avec `localStorage[PUSH_ASKED_KEY]` posé → idem ; sinon rend titre « Être prévenu·e si ça matche ? », « Oui, sur cet appareil » appelle `enablePush` puis `onDone`, « Plus tard » pose la clé puis `onDone` ; le texte rendu ne contient ni « like », ni « message », ni chiffre
- [ ] T030 [P] [US3] Test `src/app/(main)/bienvenue/__tests__/page.test.tsx` (ajout) : `PUT { onboardingStep: 3 }` est envoyé **avant** que `StepPush` soit rendu

### Implementation for User Story 3

- [ ] T031 [US3] Créer `src/components/onboarding/StepPush.tsx` : hero cœur `bg-sunken`, copie du prototype, `enablePush()` / `getPushState()` / `getPushSupport()` de `src/lib/push/` (réutiliser la copie d'états de `PushSettings.tsx` si un état inattendu survient) ; vert sur T029
- [ ] T032 [US3] Brancher `StepPush` dans `src/app/(main)/bienvenue/page.tsx` après le passage à 3 ; `localStorage` en `try/catch` ; vert sur T030

**Checkpoint**: T029/T030 verts ; quickstart S5 ; capture de l'écran push clair/sombre.

---

## Phase 6: User Story 4 — Une relance qui ne harcèle pas (Priority: P2)

**Goal**: la carte « Ton profil » en première cellule de « Pour toi », dans
l'ordre photo > cherche > position, écartable 7 jours, sans nombre. Ferme **#343**.

**Independent Test**: quickstart S6 sur un compte existant sans photo.

### Tests for User Story 4

- [ ] T033 [P] [US4] Test rouge `src/components/__tests__/ProfileNudgeCard.test.tsx` : pour chaque `MissingKind`, rend la copie de `NUDGE_COPY` et un lien vers l'ancre attendue ; « Plus tard » appelle `onDismiss` ; le texte ne contient aucun chiffre ; la carte porte `aria-label="Compléter ton profil"`
- [ ] T034 [P] [US4] Test rouge `src/app/(main)/discover/__tests__/nudge-card.test.tsx` : profil sans photo + pas de clé → carte rendue avant le premier `ProfileCard` ; clé datée d'hier → pas de carte ; clé datée de 8 jours → carte ; profil complet → pas de carte ; `localStorage` qui `throw` → carte rendue

### Implementation for User Story 4

- [ ] T035 [US4] Créer `src/components/ProfileNudgeCard.tsx` : `Card` silhouette `ProfileCard`, zone haute `bg-sunken` avec cœur coral, eyebrow « Ton profil », titre, texte, `Button` primary (lien) + ghost « Plus tard » ; vert sur T033
- [ ] T036 [US4] Insérer la carte dans la grille de `src/app/(main)/discover/page.tsx` (avant `visibleUsers`, uniquement sur `tab === 'all'` et page 1), pilotée par `deriveMissing(profile)` et `NUDGE_DISMISS_KEY` (lecture/écriture en `try/catch`) ; ajuster `GridFillerCards` si `realCount` doit compter la carte ; vert sur T034
- [ ] T037 [P] [US4] Poser `id="profile-section-position"` sur le conteneur de `ProfilePositionCard` dans `src/components/ProfilePositionCard.tsx` (les deux autres ancres existent via `ProfileSection`)

**Checkpoint**: T033/T034 verts ; quickstart S6 ; captures de la grille avec carte en 420 px et 1080 px.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T038 [P] Test rouge puis ajout dans `src/app/api/admin/stats/route.ts` (+ `src/app/api/admin/stats/__tests__/route.test.ts`) : `onboarding30d` = `{ signups, withPhoto, withPosition, withRelationshipType, returnedAfterDay1, pushDevices }` sur les comptes créés depuis 30 jours ; affichage en `CountChip` dans `src/app/(admin)/admin/page.tsx` (surface admin, autorisé) — research R10
- [ ] T039 [P] Mettre à jour `CLAUDE.md` (Sécurité : « `onboardingStep` privé, garde `onboarding-step-never-leaks` » ; Notifications : « la proposition push en fin de parcours est la même opt-in par appareil ») et fermer la boucle dans `PRODUCT.md` si la section onboarding y manque
- [ ] T040 [P] Vérifier `src/app/api/users/me/export/route.ts` : l'export RGPD inclut `onboardingStep` (c'est à la membre) — ajouter un `it` si un test d'export existe
- [ ] T041 Gates locaux complets : `npx vitest run`, `npx tsc --noEmit`, `npx eslint .` ; base locale `libre_local_005` (clone + `migrate deploy` local) ; rejouer quickstart S1–S8 ; captures Playwright (chromium en cache) des 4 écrans et de la grille en 420 px et 1080 px, clair et sombre, échantillonnées en plusieurs points, jointes à la PR
- [ ] T042 Ouvrir la PR `feat/005-premier-quart-d-heure` **en brouillon** dès le premier push, base `main`, corps avec `Closes #342`, `Closes #135`, `Closes #411`, `Closes #343` + lien spec + captures ; passer `ready` seulement après T041 ; le merge reste le checkpoint opérateur
- [ ] T043 Après merge et déploiement : relever la baseline admin (T038) le jour J, noter dans la mémoire projet la date pour la lecture à J+21 (SC-001…SC-007)

---

## Dependencies & Execution Order

- **Phase 1 → 2 → 3 → 4 → 5 → 6 → 7**. US1 ne dépend que de la phase 2. US2
  dépend de la phase 2 (colonne, `PUT`, `mustOnboard`). US3 dépend de US2
  (la page `/bienvenue`). US4 dépend de la phase 2 (`deriveMissing`) et de
  T037, pas de US2/US3.
- Le prototype est **déjà validé** : les tâches UI (T022–T026, T031, T035)
  peuvent démarrer dès leurs tests rouges écrits.

### Parallel opportunities

- Phase 2 : T006 ∥ T008 ∥ T011 ; T004 → T005 ; T009 → T010.
- US1 : T012 ∥ T013, puis T014 → T015.
- US2 : T016–T021 tous en parallèle (tests), puis T023 ∥ T024 ∥ T025 après T022 ; T026 → T027 → T028.
- US4 peut se mener en parallèle de US2/US3 (fichiers distincts, sauf `discover/page.tsx` : T027 et T036 touchent le même fichier — sérialiser ces deux-là).
- Phase 7 : T038 ∥ T039 ∥ T040.

## Implementation Strategy

- **MVP = Phase 1 + 2 + US1** : plus aucun compte invisible, feed qui montre
  des visages d'abord. Livrable seul si besoin, sans aucune nouvelle surface.
- Puis **US2** (le cœur : le parcours), **US3** (la seule raison honnête de
  revenir) et **US4** (les 52 déjà inscrits), dans la même PR de lot sauf
  demande contraire de l'opérateur.
- Ordre de commit conseillé dans le lot : une série de commits `feat(#NNN)`
  par story, pour que la review lise l'histoire dans l'ordre des priorités.
