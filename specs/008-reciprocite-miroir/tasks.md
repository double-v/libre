---
description: "Task list — 008 Réciprocité miroir (intention et distance)"
---

# Tasks: Réciprocité miroir — intention et distance

**Input**: Design documents from `/specs/008-reciprocite-miroir/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: demandés — FR-014 exige une garde de non-régression **par route**
(principe III, corollaire #328) ; la boucle de livraison travaille en TDD.
Chaque test s'écrit et échoue avant son implémentation.

**Organization**: une phase par user story ; une issue GitHub par user story.

## Format: `[ID] [P?] [Story] Description`

- **[P]** : parallélisable (fichiers distincts, sans dépendance ouverte)
- **[Story]** : US1, US2, US3 (spec.md)

---

## Phase 1: Setup — gate visuel (principe V)

**Purpose**: aucune invitation n'est codée avant validation sur pixels.

- [ ] T001 Construire le prototype des trois surfaces (invitation dans la fiche `ProfileModal`, groupe « Type de relation » inactif dans `SearchFilters`, ligne d'invitation distance en tête de « Pour toi »), clair/sombre × mobile/desktop, avec les tokens existants de `src/app/globals.css`, et le publier sur proto-server sous `getlibre/feat-008-reciprocite-miroir/`
- [ ] T002 Faire valider le prototype par l'opérateur et reporter l'URL validée + la copie définitive dans `specs/008-reciprocite-miroir/plan.md` (ligne « V. Le pixel juge » → ✅) et dans `specs/008-reciprocite-miroir/contracts/profile-intention.md`

**Checkpoint**: prototype validé — les tâches UI (T012, T013, T020, T024) peuvent démarrer ; les tâches serveur n'en dépendent pas.

---

## Phase 2: Foundational — la règle de lecture

**Purpose**: la décision unique appelée par toutes les routes (research R1/R2).

- [ ] T003 Écrire les tests de la règle dans `src/lib/__tests__/profile-visibility.test.ts` : `hasDeclaredIntention` (liste vide → false, `['je verrai en chemin']` → true), `intentionFor` sur les cinq lignes de la table de `data-model.md` (soi-même, lectrice déclarée, les deux vides, voilé, lectrice inconnue `undefined` → voilé)
- [ ] T004 Implémenter `hasDeclaredIntention(list)`, `canSeeIntention({ isSelf, viewerIntention })` et `intentionFor({ isSelf, viewerIntention, relationshipType })` → `{ relationshipType } | { relationshipTypeVeiled: true }` dans `src/lib/profile-visibility.ts`, docstring en français qui cite #328/#330 (pourquoi une seule fonction)

**Checkpoint**: T003 vert.

---

## Phase 3: User Story 1 — L'intention des autres se lit une fois la sienne dite (P1) 🎯 MVP

**Goal**: aucune réponse ne livre l'intention d'autrui à une lectrice non déclarée ; l'interface affiche l'invitation à la place.

**Independent Test**: quickstart scénarios 1, 2, 3 et 6.

### Tests (écrits d'abord, doivent échouer)

- [ ] T005 [P] [US1] Créer la garde `src/__tests__/intention-never-leaks.test.ts` sur le motif de `src/__tests__/city-label-never-leaks.test.ts` (base factice qui honore `select`) : pour `GET /api/users/[id]`, `GET /api/geoloc/nearby`, `GET /api/geoloc/crossings`, lectrice sans intention → le JSON sérialisé de la personne lue ne contient aucune valeur de `RELATIONSHIP_TYPE_OPTIONS` et porte `relationshipTypeVeiled: true` ; lectrice déclarée → valeur présente ; soi-même → valeur présente ; profil lectrice introuvable → voilé
- [ ] T006 [P] [US1] Ajouter à `src/app/api/discover/__tests__/` (créer `intention-filter.test.ts` si absent) : lectrice sans intention + `?relationshipType=sérieux` → le `where` Prisma ne contient pas de filtre `relationshipType` ; lectrice déclarée → `hasSome` présent

### Implementation

- [ ] T007 [US1] `src/app/api/users/[id]/route.ts` : ajouter `relationshipType` au `select` du profil lectrice déjà lu (bloc voile photo, `viewer`), le lire aussi quand `isSelf` est faux et que le bloc photo ne s'exécute pas, et remplacer `publicProfile.relationshipType = …` par l'étalement de `intentionFor(...)`
- [ ] T008 [US1] `src/app/api/geoloc/nearby/route.ts` : sélectionner `relationshipType` dans `myProfile` et remplacer `relationshipType: otherProfile.relationshipType` par `...intentionFor(...)`
- [ ] T009 [US1] `src/app/api/geoloc/crossings/route.ts` : lire le profil lectrice (`profile.findUnique({ where: { userId }, select: { relationshipType: true } })`), appliquer `intentionFor` aux deux sélections qui exposent `relationshipType` ; ajuster le type dans `src/components/CrossingsView.tsx` (`relationshipType?: string[]; relationshipTypeVeiled?: true`)
- [ ] T010 [US1] `src/app/api/discover/route.ts` : remonter la lecture de `myProfile` avant la construction du `where`, et n'ajouter le filtre `relationshipType` que si `hasDeclaredIntention(myProfile?.relationshipType ?? [])` (research R3)
- [ ] T011 [P] [US1] Tests composants : `src/components/__tests__/ProfileModal.test.tsx` (voilé → invitation + lien `/profile#profile-section-seeking`, pas de valeur ; `[]` → rien) et `src/components/__tests__/SearchFilters.test.tsx` (`intentionDeclared={false}` → groupe inactif + invitation, choix enregistrés conservés)
- [ ] T012 [US1] `src/components/ProfileModal.tsx` : corriger le type `relationshipType` (tableau), ajouter `relationshipTypeVeiled`, rendre l'invitation validée en T002 (copie française sans chiffre ni mention d'autrui, cible ≥ 44 px, focus coral)
- [ ] T013 [US1] `src/components/SearchFilters.tsx` : prop `intentionDeclared`, groupe « Type de relation » non interactif avec l'invitation ; `src/app/(main)/discover/page.tsx` : passer `intentionDeclared` depuis le profil déjà chargé (ligne `setNudgeKind(deriveMissing(...))`)

**Checkpoint**: T005/T006/T011 verts ; quickstart 1, 2, 3, 6 passent en local.

---

## Phase 4: User Story 2 — « Je verrai en chemin » compte comme une réponse (P1)

**Goal**: une réponse d'indécision disponible partout où l'on choisit son intention, qui lève le voile.

**Independent Test**: quickstart scénario 4.

**Livraison** : dans le même lot que l'US1, jamais après (sinon l'US1 force une étiquette).

- [ ] T014 [P] [US2] Test dans `src/lib/__tests__/taxonomy.test.ts` (créer si absent) : `RELATIONSHIP_TYPE_OPTIONS` contient `'je verrai en chemin'`, chaque valeur ≤ 30 caractères (validateur `src/lib/validators.ts:56`)
- [ ] T015 [US2] Ajouter `'je verrai en chemin'` en dernière position de `RELATIONSHIP_TYPE_OPTIONS` dans `src/lib/taxonomy.ts`, commentaire : pourquoi une valeur dédiée plutôt que « autre » (clarification 2026-09-25)
- [ ] T016 [P] [US2] Vérifier le rendu de la nouvelle valeur (longueur de chip, retour à la ligne) dans `src/components/onboarding/StepSeeking.tsx`, la section intention de `src/app/(main)/profile/page.tsx` et `src/components/SearchFilters.tsx` ; ajuster seulement si le prototype T002 l'exige
- [ ] T017 [US2] Étendre `src/__tests__/intention-never-leaks.test.ts` : lectrice avec `['je verrai en chemin']` seule → intention d'autrui visible
- [ ] T018 [P] [US2] Vérifier que le bloc `onboarding` de `src/app/api/admin/stats/route.ts` (et `src/lib/admin-analytics.ts`) compte un profil `['je verrai en chemin']` comme ayant une intention ; ajouter le cas au test existant

**Checkpoint**: quickstart 4 passe.

---

## Phase 5: User Story 3 — L'absence de distance s'explique (P2)

**Goal**: une invitation unique vers l'étape « où » quand la lectrice n'a pas de position.

**Independent Test**: quickstart scénario 5.

- [ ] T019 [P] [US3] Test d'une fonction pure `shouldInviteDistance({ hasPosition, nudgeKind, nudgeVisible })` dans `src/lib/__tests__/onboarding.test.ts` : pas de position + carte absente ou autre manque → true ; carte visible sur `position` → false ; position présente → false
- [ ] T020 [US3] Implémenter `shouldInviteDistance` dans `src/lib/onboarding.ts` (même règle de position que `deriveMissing`) et rendre la ligne d'invitation une seule fois en tête du segment « Pour toi » dans `src/app/(main)/discover/page.tsx`, lien `/profile#profile-section-position`, jamais sur « À proximité » ni sur une carte
- [ ] T021 [US3] Ajouter la copie de l'invitation distance à côté de `NUDGE_COPY` dans `src/lib/onboarding.ts` et l'inclure dans le test de copie existant (sans chiffre, sans référence aux autres)

**Checkpoint**: quickstart 5 passe.

---

## Phase 6: Polish & Cross-Cutting

- [ ] T022 [P] Documenter la règle dans `CLAUDE.md` (section Sécurité, une ligne : intention voilée pour une lectrice non déclarée, garde `intention-never-leaks.test.ts`) et la copie dans `DESIGN.md` si un motif d'invitation y est ajouté
- [ ] T023 Gates : `npx vitest run`, `npm run lint`, `npm run build` dans le worktree (sortie redirigée dans le scratchpad, lecture au `grep`)
- [ ] T024 E2E pixels (local, chromium en cache, jamais Neon) : quickstart 1–6 ; échantillonner plusieurs points de chaque invitation, clair/sombre, 390 px et 1080 px
- [ ] T025 Noter dans `specs/008-reciprocite-miroir/spec.md` la date de mise en ligne et la ligne de base relevée le 2026-10-11 (bloc onboarding des stats admin) pour la lecture SC-002/SC-003 à J+30

---

## Dependencies & Execution Order

- **Phase 1 (gate visuel)** → bloque T012, T013, T016, T020, T024 uniquement.
- **Phase 2** → bloque US1, US2 (T017), US3 n'en dépend pas.
- **US1 et US2** : livrées ensemble (même lot). US2 peut précéder US1.
- **US3** : indépendante ; peut partir en parallèle de US1 dès T002.
- **Mise en ligne** : après la relecture J+21 de la spec 005 (2026-10-11).

### Parallel Opportunities

- T005, T006 et T011 (tests de fichiers distincts) en parallèle après T004.
- T007, T008, T009 touchent trois routes distinctes : parallélisables entre elles une fois T005 écrit (non marquées [P] car chacune doit faire passer une partie du même fichier de test).
- T014, T016, T018 en parallèle.
- Phase 5 entière en parallèle de la phase 3 (fichiers disjoints sauf `discover/page.tsx` : T013 et T020 à enchaîner).

### Parallel Example: User Story 1

```text
Après T004 :
  T005 garde intention-never-leaks
  T006 test filtre discover
  T011 tests ProfileModal + SearchFilters
Puis : T007 → T008 → T009 → T010 (serveur), T012 → T013 (UI, après T002)
```

---

## Implementation Strategy

**MVP** : Phase 2 + US1 + US2 dans un lot (une branche tampon, une PR, un
déploiement), car l'US1 sans l'US2 contredirait l'inclusion silencieuse.
Le côté serveur (T003–T010, T014–T015, T017) peut être livré avant la
validation du prototype ; l'UI attend T002.

**Incrément 2** : US3, léger, dans le même lot si le prototype est validé en
une fois, sinon en suivant.

**Mesure** : ligne de base le 2026-10-11, mise en ligne ensuite, lecture à J+30.
