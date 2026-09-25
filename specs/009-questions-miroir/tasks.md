---
description: "Task list — 009 Questions de profil en miroir"
---

# Tasks: Questions de profil en miroir

**Input**: Design documents from `/specs/009-questions-miroir/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: demandés — FR-012 exige une garde de non-fuite par route ; TDD.

**Organization**: une phase par user story ; une issue par user story —
US1 #461, US2 #462, US3 #463, US4 #465.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup — gate visuel et banque

- [x] T001 Faire valider par l'opérateur la banque initiale de `research.md` (R1) ; reporter la version validée dans `specs/009-questions-miroir/research.md`
- [x] T002 Construire le prototype (section « Mes questions » par thèmes ; « Répondre à la suite » ; pastilles + « Tu veux préciser ? » ; « Ceci ou cela » ; fiche : en commun d'abord, voilées, saisie en place, « Voir toutes ses réponses » ; mention « retirée par la modération »), clair/sombre × 390/1080, tokens existants ; publier sur proto-server sous `getlibre/feat-009-questions-miroir/`
- [x] T003 Faire valider le prototype ; reporter URL et copie dans `plan.md` (ligne V → ✅) et `contracts/answers-api.md`

**Checkpoint**: T001 et T003 validés — l'UI (T018–T021, T025) peut démarrer ; le serveur n'en dépend pas (sauf T005 pour la liste).

---

## Phase 2: Foundational

- [x] T004 [P] Extraire `contientUnContact` de `src/lib/pseudo.ts` vers `src/lib/contact.ts` (export), déplacer ses cas de test dans `src/lib/__tests__/contact.test.ts` ; `pseudo.test.ts` reste vert sans changement
- [x] T005 [P] Test puis `src/lib/questions.ts` : banque validée (T001), clés uniques `[a-z-]+` (questions et options), formats cohérents (`choix` 2–5 options, `ceci-ou-cela` 2, `ouverte` aucune ; `exclusive` seulement si `multiple`), espace insécable avant « ? », `proposedQuestions(theme?)` (hors `retired`), `questionByKey`
- [x] T006 Migration `prisma/migrations/20260926100000_profile_answers/migration.sql` (table, `UNIQUE(userId, questionKey)`, index `(userId)`, FK cascade) + `model ProfileAnswer` dans `prisma/schema.prisma` (+ relation sur `User`) ; appliquer sur une base locale, jamais Neon
- [x] T007 Tests puis `src/lib/answers.ts` : `validateAnswer(question, { choice, text })` par format (FR-002b ; texte R6 : NFC, sauts de ligne gardés, 0/1–300, contact refusé via `contact.ts`, invisibles refusés, emoji permis ; `choices` ∈ options, un seul si choix unique ou ceci-ou-cela, sans doublon, exclusive seule), `answersFor({ isSelf, viewerKeys, answers })` (table de `data-model.md`, ni choix ni texte si voilé, réponses `removed` jamais vers autrui, tri : en commun d'abord)

**Checkpoint**: T004–T007 verts.

---

## Phase 3: User Story 1 — Répondre à des questions (P1) 🎯 MVP

**Goal**: une membre répond (pastille et/ou texte), modifie, retire, sans limite ; par thèmes ou « à la suite ».

**Independent Test**: quickstart 1, 4, 5.

- [x] T008 [P] [US1] Tests `src/app/api/users/me/answers/__tests__/route.test.ts` : GET (mes réponses + banque), PUT (création, modification, clé inconnue/retirée 400, format non respecté 400, choix hors options / en double / plusieurs pour un choix unique / exclusive combinée 400, contact 400 avec motif, champs ignorés), DELETE idempotent, 401, 429
- [x] T009 [US1] `src/app/api/users/me/answers/route.ts` (GET/PUT/DELETE) ; préréglage `answers` dans `src/lib/rate-limit-upstash.ts` (R9)
- [x] T010 [P] [US1] Export : ajouter les réponses à `src/app/api/users/me/export/route.ts` + test ; vérifier la cascade à la suppression du compte (test existant de suppression ou nouveau cas)
- [x] T011 [P] [US1] Tests `src/components/__tests__/AnswerInput.test.tsx` (pastille seule = réponse ; choix unique : une pastille remplace l'autre ; choix multiple : ajout/retrait, option exclusive qui retire les autres ; phrase « Choisis une réponse. » / « Tu peux choisir plusieurs réponses. » ; précision repliée jusqu'au choix ; texte requis pour une ouverte ; aide affichée pour `habitudes`) et `ProfileAnswers.test.tsx` (thèmes, « Répondre à la suite » avec « Passer », retrait, refus relayé, mention « retirée par la modération »)
- [x] T012 [US1] `src/components/AnswerInput.tsx`, `src/components/ProfileAnswers.tsx` et intégration dans `src/app/(main)/profile/page.tsx` (section après la bio), après T003

**Checkpoint**: quickstart 1, 4, 5.

---

## Phase 4: User Story 2 — Lire en miroir (P1)

**Goal**: la réponse d'autrui n'est lue qu'après avoir répondu à la même question ; saisie en place.

**Independent Test**: quickstart 2, 3, 5.

- [x] T013 [P] [US2] Garde `src/__tests__/answers-never-leak.test.ts` (base factice honorant `select`, sentinelle dans le texte) sur `GET /api/users/[id]` : voilé, visible, soi-même, lectrice introuvable, réponse `removed` jamais envoyée
- [x] T014 [US2] `src/app/api/users/[id]/route.ts` : lire les réponses publiées de la personne lue et les clés publiées de la lectrice, sérialiser via `answersFor`
- [x] T015 [P] [US2] Tests `src/components/__tests__/AnswerBlock.test.tsx` : visible (un ou plusieurs choix en pastilles, précision, texte), voilée + invitation, saisie en place selon le format → PUT puis `onAnswered`, « Voir toutes ses réponses » replié, aucun nombre affiché
- [x] T016 [US2] `src/components/AnswerBlock.tsx` (après T003)
- [x] T017 [US2] `src/components/ProfileModal.tsx` : section « Ses réponses » (après la bio), relecture de la fiche après `onAnswered`

**Checkpoint**: quickstart 2, 3, 5.

---

## Phase 5: User Story 3 — Modérer (P2)

**Goal**: réponses visibles dans le signalement, retrait journalisé.

**Independent Test**: quickstart 6.

- [x] T018 [P] [US3] Tests `src/app/api/admin/answers/[id]/__tests__/route.test.ts` : 403 non-admin, retrait → `status: 'removed'`, `ModerationLog` `REMOVE_ANSWER` avec la clé (jamais le texte)
- [x] T019 [US3] `src/app/api/admin/answers/[id]/route.ts`
- [x] T020 [US3] Admin des signalements (`src/app/(admin)/admin/reports/…` et sa route) : réponses publiées du profil signalé + bouton « Retirer » ; ajouter la route à `src/app/api/admin/__tests__/admin-access.test.ts`

**Checkpoint**: quickstart 6.

---

## Phase 6: User Story 4 — « Ceci ou cela » (P2)

**Goal**: répondre en jouant, un toucher par paire.

**Independent Test**: quickstart 8.

- [x] T026 [P] [US4] Tests `src/components/__tests__/ThisOrThat.test.tsx` : une paire à la fois, toucher → PUT puis paire suivante sans réponse, « Passer » n'enregistre rien, sortie libre, aucun compteur
- [x] T027 [US4] `src/components/ThisOrThat.tsx` (après T003), lancé depuis la section du profil ; sur la fiche, les paires visibles s'affichent en ligne compacte (`AnswerBlock`)

**Checkpoint**: quickstart 8.

---

## Phase 7: Polish & Cross-Cutting

- [x] T021 [P] Bloc `answers` (fait sans la comparaison « vs hasard » : indicateur brut, à interpréter avec le nombre de réponses) de `GET /api/admin/stats` (R8 : part des profils avec ≥ 1 réponse ; part n'ayant répondu que par des choix, SC-006 ; part des conversations dont les deux membres partagent une question, vs hasard) + test
- [x] T022 [P] `CLAUDE.md` (section Sécurité : règle miroir des réponses, garde `answers-never-leak`, contact partagé `contact.ts`), `DESIGN.md` (motif pastilles + précision, « Ceci ou cela »), CGU : clause « ne pas promouvoir ni proposer de produits illicites dans les réponses »
- [x] T023 Gates : `npx vitest run`, `npm run lint`, `npx next build` sur base locale (sorties dans le scratchpad)
- [x] T024 E2E pixels (base locale) : quickstart 1–7, clair/sombre, 390/1080, plusieurs points par élément
- [ ] T025 Noter la date de mise en ligne dans `spec.md` pour la lecture SC-002/SC-003 à J+30

---

## Dependencies & Execution Order

- T001 → T005 → (T007, T009, T014). T003 bloque seulement l'UI (T012, T016, T017, T020).
- T004 ∥ T005 ∥ T006 ; T007 dépend de T004 et T005.
- US1 et US2 dans le même lot (US2 sans réponses n'a rien à lire) ; US3 dans le même lot avant ouverture (texte libre visible).

### Parallel Example

```text
Après T007 : T008, T010, T011, T013, T015, T018 (fichiers de test distincts)
Puis serveur : T009 → T014 → T019 ; UI après T003 : T012 → T016 → T017 → T020
```

## Implementation Strategy

Un lot (branche `feat/009-questions-miroir`, une PR) : fondations + US1 + US2
+ US3, UI après validation du prototype et de la banque. Pas de fenêtre de
mesure à préserver cette fois : mise en ligne dès la revue opérateur.
