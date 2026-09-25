---
description: "Task list — 009 Questions de profil en miroir"
---

# Tasks: Questions de profil en miroir

**Input**: Design documents from `/specs/009-questions-miroir/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: demandés — FR-012 exige une garde de non-fuite par route ; TDD.

**Organization**: une phase par user story ; une issue par user story —
US1 #461, US2 #462, US3 #463.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup — gate visuel et banque

- [ ] T001 Faire valider par l'opérateur la banque initiale de `research.md` (R1) ; reporter la version validée dans `specs/009-questions-miroir/research.md`
- [ ] T002 Construire le prototype (section « Mes questions » du profil ; fiche avec réponse visible, voilée, saisie en place, remplacement à 5 ; mention « retirée par la modération »), clair/sombre × 390/1080, tokens existants ; publier sur proto-server sous `getlibre/feat-009-questions-miroir/`
- [ ] T003 Faire valider le prototype ; reporter URL et copie dans `plan.md` (ligne V → ✅) et `contracts/answers-api.md`

**Checkpoint**: T001 et T003 validés — l'UI (T018–T021, T025) peut démarrer ; le serveur n'en dépend pas (sauf T005 pour la liste).

---

## Phase 2: Foundational

- [ ] T004 [P] Extraire `contientUnContact` de `src/lib/pseudo.ts` vers `src/lib/contact.ts` (export), déplacer ses cas de test dans `src/lib/__tests__/contact.test.ts` ; `pseudo.test.ts` reste vert sans changement
- [ ] T005 [P] Test puis `src/lib/questions.ts` : banque validée (T001), clés uniques `[a-z-]+`, `proposedQuestions()` (hors `retired`), `questionLabel(key)` ; test : aucune clé dupliquée, aucun intitulé vide
- [ ] T006 Migration `prisma/migrations/20260926100000_profile_answers/migration.sql` (table, `UNIQUE(userId, questionKey)`, index `(userId)`, FK cascade) + `model ProfileAnswer` dans `prisma/schema.prisma` (+ relation sur `User`) ; appliquer sur une base locale, jamais Neon
- [ ] T007 Tests puis `src/lib/answers.ts` : `ANSWERS_MAX = 5`, `validateAnswer(text)` (R6 : NFC, sauts de ligne gardés, 1–300, contact refusé via `contact.ts`, invisibles refusés, emoji permis), `answersFor({ isSelf, viewerKeys, answers })` (table de `data-model.md`, réponses `removed` jamais vers autrui)

**Checkpoint**: T004–T007 verts.

---

## Phase 3: User Story 1 — Répondre à des questions (P1) 🎯 MVP

**Goal**: une membre ajoute, modifie, retire jusqu'à 5 réponses.

**Independent Test**: quickstart 1, 4, 5.

- [ ] T008 [P] [US1] Tests `src/app/api/users/me/answers/__tests__/route.test.ts` : GET (mes réponses + banque + max), PUT (création, modification, clé inconnue/retirée 400, contact 400 avec motif, 6ᵉ sans `replaces` 409, `replaces` en transaction, champs ignorés), DELETE idempotent, 401, 429
- [ ] T009 [US1] `src/app/api/users/me/answers/route.ts` (GET/PUT/DELETE) ; préréglage `answers` dans `src/lib/rate-limit-upstash.ts` (R9)
- [ ] T010 [P] [US1] Export : ajouter les réponses à `src/app/api/users/me/export/route.ts` + test ; vérifier la cascade à la suppression du compte (test existant de suppression ou nouveau cas)
- [ ] T011 [P] [US1] Tests `src/components/__tests__/ProfileAnswers.test.tsx` : liste, ajout depuis la banque, modification, retrait, refus relayé, proposition de remplacement à 5, mention « retirée par la modération »
- [ ] T012 [US1] `src/components/ProfileAnswers.tsx` et intégration dans `src/app/(main)/profile/page.tsx` (section après la bio), après T003

**Checkpoint**: quickstart 1, 4, 5.

---

## Phase 4: User Story 2 — Lire en miroir (P1)

**Goal**: la réponse d'autrui n'est lue qu'après avoir répondu à la même question ; saisie en place.

**Independent Test**: quickstart 2, 3, 5.

- [ ] T013 [P] [US2] Garde `src/__tests__/answers-never-leak.test.ts` (base factice honorant `select`, sentinelle dans le texte) sur `GET /api/users/[id]` : voilé, visible, soi-même, lectrice introuvable, réponse `removed` jamais envoyée
- [ ] T014 [US2] `src/app/api/users/[id]/route.ts` : lire les réponses publiées de la personne lue et les clés publiées de la lectrice, sérialiser via `answersFor`
- [ ] T015 [P] [US2] Tests `src/components/__tests__/AnswerBlock.test.tsx` : visible, voilée + invitation, saisie en place → appelle PUT puis `onAnswered`, cas 409 → choix de la réponse à remplacer
- [ ] T016 [US2] `src/components/AnswerBlock.tsx` (après T003)
- [ ] T017 [US2] `src/components/ProfileModal.tsx` : section « Ses réponses » (après la bio), relecture de la fiche après `onAnswered`

**Checkpoint**: quickstart 2, 3, 5.

---

## Phase 5: User Story 3 — Modérer (P2)

**Goal**: réponses visibles dans le signalement, retrait journalisé.

**Independent Test**: quickstart 6.

- [ ] T018 [P] [US3] Tests `src/app/api/admin/answers/[id]/__tests__/route.test.ts` : 403 non-admin, retrait → `status: 'removed'`, `ModerationLog` `REMOVE_ANSWER` avec la clé (jamais le texte)
- [ ] T019 [US3] `src/app/api/admin/answers/[id]/route.ts`
- [ ] T020 [US3] Admin des signalements (`src/app/(admin)/admin/reports/…` et sa route) : réponses publiées du profil signalé + bouton « Retirer » ; ajouter la route à `src/app/api/admin/__tests__/admin-access.test.ts`

**Checkpoint**: quickstart 6.

---

## Phase 6: Polish & Cross-Cutting

- [ ] T021 [P] Bloc `answers` de `GET /api/admin/stats` (R8 : part des profils avec ≥ 1 réponse ; part des conversations dont les deux membres partagent une question, vs hasard) + test
- [ ] T022 [P] `CLAUDE.md` (section Sécurité : règle miroir des réponses, garde `answers-never-leak`, contact partagé `contact.ts`) et `DESIGN.md` si un motif est ajouté
- [ ] T023 Gates : `npx vitest run`, `npm run lint`, `npx next build` sur base locale (sorties dans le scratchpad)
- [ ] T024 E2E pixels (base locale) : quickstart 1–7, clair/sombre, 390/1080, plusieurs points par élément
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
