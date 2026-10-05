# Tasks: Indice de fiabilité et invitation automatique à la vérification

**Input**: Design documents from `/specs/010-indice-fiabilite/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: TDD — chaque module pur de `src/lib/fraude/` a son test en tableau
écrit **avant** le code (constitution, gates de qualité).

**Organization**: une phase par user story, dans l'ordre de livraison du plan
(US1 → US2 → US4 → US3 → US5).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [ ] T001 Écrire la migration additive à la main dans `prisma/migrations/20261006000000_indice_fiabilite/migration.sql` : tables `banned_identity_fingerprints` et `signup_traces`, colonne `users.verifInviteeAt`, index `likes(likerId, createdAt)`, `moderation_logs.adminId` DROP NOT NULL ; reporter dans `prisma/schema.prisma` (modèles `BannedIdentityFingerprint`, `SignupTrace`, champ `verifInviteeAt`, index `Like`, relation `ModerationLog.admin` facultative, commentaire `ProfileSignal.type`) puis `npx prisma generate`
- [ ] T002 Valider la migration sur une base PostgreSQL **locale** (`createdb -T`, `psql -f`) avant tout push — elle devient irréversible au premier deploy de preview

## Phase 2: Foundational

- [ ] T003 [P] Test puis code `src/lib/fraude/empreinte-identite.ts` : `hmacIdentite(kind: 'appareil' | 'email' | 'ip', valeur)` — clé HKDF-SHA256(`NEXTAUTH_SECRET`, info `libre:fraude:<kind>`), hex ; même entrée → même empreinte, kinds distincts → empreintes distinctes, valeur vide → `null` (test `src/lib/fraude/__tests__/empreinte-identite.test.ts`)
- [ ] T004 [P] Test puis code `src/lib/fraude/fiabilite.ts` : `FAMILLE` par type (contexte = `appareil_partage`, `inscriptions_groupees`, `fuseau_incoherent`, `profil_express`), `douteSerieux(recents)`, `niveauFiabilite(recents, isVerified)` (R8) (test `src/lib/fraude/__tests__/fiabilite.test.ts`)
- [ ] T005 Étendre `TypeSignal` dans `src/lib/fraude/signaux.ts` (9 types du data-model) et amender `dansLaFile` : `douteSerieux` **ou** l'ancienne règle restreinte aux types non-contexte ; compléter `src/lib/fraude/__tests__/` (deux faibles de contexte → hors file ; trois de types différents → file)
- [ ] T006 Libellés français des 9 types et mention « peut être légitime » pour la famille contexte dans `src/lib/fraude/libelles.ts`

**Checkpoint**: socle prêt.

## Phase 3: User Story 1 — Signaux forts (P1) 🎯 MVP

**Goal**: blocages en rafale, retour d'un banni, lexique de l'arnaque entrent dans la file.
**Independent Test**: quickstart scénarios 1, 2, 3.

- [ ] T007 [P] [US1] Test puis code `src/lib/fraude/lexique.ts` : `detecterLexique(texte)` — normalisation (casse, accents, séparateurs intercalés), mots entiers, liste R4 ; faux positifs en tableau (« recharger mes batteries » ne matche pas « recharge » seul, mot entier)
- [ ] T008 [US1] Brancher le lexique dans `analyserTexteProfil` (`src/lib/fraude/analyse.ts`) : signal fort `lexique_arnaque`, clé `lexique:<terme>`, extrait ≤ 200 ; aucun refus d'écriture
- [ ] T009 [P] [US1] Test puis code `verifierBlocages(blockedId, now)` dans `src/lib/fraude/comportement.ts` (R2 : 3 bloqueurs distincts ≥ 7 j sur 48 h)
- [ ] T010 [US1] `src/app/api/blocks/route.ts` : `after(() => verifierBlocages(...))`, erreur journalisée sans PII, réponse inchangée
- [ ] T011 [US1] `retenirEmpreintes` dans `src/lib/fraude/bannissement.ts` : copier aussi `deviceId` et `normalizedEmail` en HMAC dans `banned_identity_fingerprints`
- [ ] T012 [P] [US1] Test puis code `analyserInscription` (volet banni) dans `src/lib/fraude/inscription.ts` : signal fort `retour_banni`, clé `banni:<kind>`
- [ ] T013 [US1] `src/app/api/auth/register/route.ts` : `after(() => analyserInscription({ userId, deviceId, normalizedEmail, ip }))`
- [ ] T014 [US1] Rétention : règle `empreintesIdentiteBannies` (365 j, bannissement) dans `src/lib/retention/regles.ts` + purge dans `src/lib/retention/purge.ts` + test
- [ ] T015 [US1] Politique : finalité anti-fraude étendue, catégories (empreintes chiffrées d'appareil et d'e-mail), recours humain — `src/app/(legal)/confidentialite/page.tsx`

**Checkpoint**: US1 livrable seule.

## Phase 4: User Story 2 — Invitation automatique (P1)

**Goal**: un compte non vérifié « douteux » reçoit une invitation, sans retrait.
**Independent Test**: quickstart scénarios 4, 5, 6.

- [ ] T016 [P] [US2] Test puis code `verifierRythmeLikes(likerId, now)` dans `src/lib/fraude/comportement.ts` (R3 : compte < 7 j, ≥ 30 en 24 h dont ≥ 15 en 10 min)
- [ ] T017 [US2] `src/app/api/likes/route.ts` : `after(() => verifierRythmeLikes(...))`
- [ ] T018 [US2] Test puis code `evaluerCompte(userId)` dans `src/lib/fraude/invitation.ts` (R9) : niveau douteux ∧ ¬vérifié ∧ ¬retrait ∧ ¬invité → `verifInviteeAt` + `moderation_logs` `INVITE_VERIFICATION` `adminId = null`
- [ ] T019 [US2] Appeler `evaluerCompte` après chaque signal **nouveau** dans `enregistrerSignal` (`src/lib/fraude/signaux.ts`) ; option `{ inviter: false }` pour le rattrapage
- [ ] T020 [US2] `GET /api/users/profile` : `invitationVerification: true` pour soi seulement (`src/app/api/users/profile/route.ts`)
- [ ] T021 [US2] `PATCH /api/admin/verifications/[id]` : approuvé → `verifInviteeAt = null` ; refusé alors qu'invité → signal `verification_refusee`
- [ ] T022 [US2] Variante « invitation » de `src/components/RetraitNotice.tsx` : copie sans motif ni chiffre, lien vers la vérification, écartable 24 h (`libre:invitation-ecartee`, try/catch) ; test de composant
- [ ] T023 [US2] Journal admin : `adminId` null rendu « Automatique » (page et route du journal de modération)

## Phase 5: User Story 4 — Indices faibles (P3)

**Independent Test**: quickstart scénario 7.

- [ ] T024 [P] [US4] `analyserInscription` (volet appareil partagé) : signal faible `appareil_partage` sur les deux comptes actifs
- [ ] T025 [P] [US4] `analyserInscription` (volet IP) : trace `signup_traces` + signal `inscriptions_groupees` à 3 en 24 h ; règle `tracesInscription` (7 j) + purge
- [ ] T026 [P] [US4] Test puis code `src/lib/fraude/fuseau.ts` : `fuseauIncoherent(tz, lat, lng)` (R6) ; brancher dans `PUT /api/users/profile` sur ville manuelle, client qui joint `fuseau`
- [ ] T027 [US4] `verifierProfilExpress(userId)` dans `src/lib/fraude/comportement.ts` (R7), appelé depuis la route des likes

## Phase 6: User Story 3 — Indice admin (P2)

**Independent Test**: quickstart scénario 8.

- [ ] T028 [US3] `GET /api/admin/users` : `niveau`, `tri=fiabilite`, colonnes `niveau` et `signauxRecents`, 400 sur valeur inconnue (`src/app/api/admin/users/route.ts`) + test
- [ ] T029 [US3] `GET /api/admin/users/[id]` : bloc `fiabilite` (contracts/api.md)
- [ ] T030 [US3] Page `src/app/(admin)/admin/users/page.tsx` : filtre et tri, niveau en `Tag` ; fiche `[id]/page.tsx` : liste des indices
- [ ] T031 [US3] Rattrapage `POST /api/admin/profils-a-verifier/analyse` : blocages, appareil partagé, lexique, sans invitation

## Phase 7: User Story 5 — Transparence et non-fuite (P2)

- [ ] T032 [US5] Étendre la garde `src/__tests__/signaux-never-leak.test.ts` : `verifInviteeAt`, `niveau`, `fiabilite`, `ipHash`, `hash` absents de toute route membre
- [ ] T033 [US5] Relire la politique : base légale, durées (7 j, 1 an), décision humaine, droit de contester ; tableau de conservation généré depuis `regles.ts`

## Phase 8: Polish

- [ ] T034 Captures Playwright locales (bandeau mobile 390 / desktop 1080, clair/sombre ; liste admin filtrée) — échantillonner plusieurs points
- [ ] T035 `npx tsc --noEmit`, `npx eslint` des fichiers touchés, `npx vitest run`, `npx next build` (pas `npm run build`)
- [ ] T036 Mettre à jour `CLAUDE.md` (section Sécurité : spec 010, champs privés)

## Dependencies & Execution Order

- Setup → Foundational → US1 → US2 → (US4 ∥ US3) → US5 → Polish.
- US2 dépend de `fiabilite.ts` (T004) et de signaux réels (US1).
- US3 est utile seule mais montre davantage après US4.

### Parallel Opportunities

- T003 ∥ T004 ; T007 ∥ T009 ∥ T012 ; T024 ∥ T025 ∥ T026.

## Implementation Strategy

### Stratégie de livraison

**Un lot, une PR, un deploy** (préférence opérateur) : branche
`feat/010-fiabilite-lot1`, PR vers `main` avec `Closes` de chaque issue de
story. La migration est validée sur base locale (T002) avant le premier push.
