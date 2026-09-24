# Tasks: Où en est Libre — journal d'avancement (MVP)

**Input**: Design documents from `/specs/007-journal-avancement/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Ticket** : **#351** (épique #350). Un seul lot = une branche `feat/351-journal` = une PR (`Closes #351`), les user stories en étapes committées successivement (research R7). Pas d'issue par story.

**Tests**: TDD — la constitution l'impose (gate 1, promesse adossée à un test par route). Chaque tâche de code a son test écrit **avant**, dans la tâche qui précède ou dans la même.

## Format: `[ID] [P?] [Story] Description`

- **[P]** : parallélisable (fichiers différents, sans dépendance en attente)
- **[Story]** : US1…US4 de spec.md ; FR-023 est rattachée à US4 (points d'accès et réglages)

---

## Phase 1: Setup

- [ ] T001 Créer le worktree `/home/w/projects/.worktrees/getlibre/feat/351-journal/` sur la branche `feat/351-journal` depuis `libre/main` ; `.env` copié, `node_modules` en liens durs (`cp -al`), `npx prisma generate`, `npx vitest run` vert au départ
- [ ] T002 Proposer dans `DESIGN.md` (section Component Library) les deux besoins non couverts : `Prose` (texte long lisible : paragraphes, listes, liens, largeur `reading`, tokens) et le bloc d'alertes éditoriales (réutilisation d'`Alert` si ses variantes suffisent, sinon extension décrite) — **avant tout code d'interface** (constitution IV)

---

## Phase 2: Foundational (bloque toutes les stories)

- [ ] T003 Ajouter le modèle `JournalPost` (`@@map("journal_posts")`, champs et index de data-model.md, relation `auteur` vers `User` en `SetNull`) et `SiteConfig.featuresEnabled String[] @default([])` **sans `@map`** dans `prisma/schema.prisma` ; écrire à la main `prisma/migrations/20260925100000_journal_posts/migration.sql` et `prisma/migrations/20260925100100_features_enabled/migration.sql` (additives) ; `npx prisma generate` — jamais `migrate dev`
- [ ] T004 [P] Tests puis analyseur `src/lib/journal/texte.ts` : `analyser(corps) → Bloc[]` (paragraphe, liste à puces, liste numérotée ; en ligne : texte, gras, italique, lien) et `extrait(corps, max=200)` en texte brut ; liens `https://` et `/…` seulement, tout autre schéma rendu en texte ; balisage HTML conservé comme texte — tests dans `src/lib/journal/__tests__/texte.test.ts` (dont `<script>`, `javascript:`, `[x](data:…)`, liste imbriquée, mot de 300 caractères)
- [ ] T005 [P] Tests puis `src/lib/journal/slug.ts` : `slugDepuisTitre(titre)` (minuscules, sans accents, tirets, 80 car. max) et `slugLibre(base, existe)` (suffixe `-2`, `-3`…) — tests dans `src/lib/journal/__tests__/slug.test.ts`
- [ ] T006 [P] Tests puis `src/lib/journal/regles.ts` : les 7 règles de spec.md § Règles éditoriales (`id`, `enonce`, `aEviter`, `plutot`) et leurs motifs (research R3) avec `bloquant` ; e-mail et téléphone bloquants, tous les autres levables — tests dans `src/lib/journal/__tests__/regles.test.ts` (chaque règle a énoncé + exemple + reformulation ; ids uniques)
- [ ] T007 Tests puis `src/lib/journal/garde-fous.ts` : `controler(titre, corps) → Alerte[]` (extrait, règle, motif, `bloquante`, `empreinte` = SHA-256 tronqué de règle+extrait) et `verifierPublication({ titre, corps, levees, reglesRelues }) → { ok } | { ok: false, alertes, motif }` — tests dans `src/lib/journal/__tests__/garde-fous.test.ts` : jeu de référence **un positif et un négatif par motif** (SC-004), levée invalidée quand l'extrait change (FR-019), bloquante non levable (FR-016), `reglesRelues` requis (FR-018), et les **trois premières publications prévues** (mise à jour, conseils anti-arnaque, cap des 100 inscrits rédigé « plus de 100 ») sans alerte bloquante (SC-007)
- [ ] T008 [P] Tests puis fonctionnalités coupées par défaut dans `src/lib/features.ts` : `journal_comments` dans `FEATURES`, `DEFAUTS` (`journal_comments: false`), `COPY_FEATURES.journal_comments` (effet « à venir »), `featuresDepuisConfig(disabled, enabled)` et `configDepuisFeatures → { featuresDisabled, featuresEnabled }` (research R4) ; lecture des deux colonnes dans `src/lib/features-server.ts` ; normalisation de `src/hooks/useFeatures.ts` partant de `DEFAUTS` (clé coupée par défaut : seul un `true` l'active) — tests mis à jour dans les `__tests__` existants de ces trois fichiers, dont « base neuve → `journal_comments` coupé, les trois autres activés »

**Checkpoint** : logique pure verte, schéma généré ; aucune interface encore.

---

## Phase 3: User Story 3 + User Story 2 côté serveur — rédiger sous garde-fous (P1)

**Goal**: un admin crée, enregistre, contrôle, publie, modifie, dépublie ; le serveur refuse toute publication qui n'a pas passé les garde-fous.

**Independent Test**: scénarios 1 et 3 de quickstart.md joués contre les routes (sans interface).

- [ ] T009 [P] [US2] Tests puis `src/app/api/admin/journal/route.ts` (GET liste, POST brouillon ; bornes de longueur ; 404 non-admin) — `src/app/api/admin/journal/__tests__/route.test.ts`
- [ ] T010 [P] [US2] Tests puis `src/app/api/admin/journal/[id]/route.ts` (GET, PUT brouillon — 409 si publiée —, DELETE brouillon jamais publié — 409 sinon —, trace `DELETE_DRAFT`) — `src/app/api/admin/journal/[id]/__tests__/route.test.ts`
- [ ] T011 [P] [US3] Tests puis `src/app/api/admin/journal/controle/route.ts` (renvoie `controler()`, aucun effet en base) — `src/app/api/admin/journal/controle/__tests__/route.test.ts`
- [ ] T012 [US3] Tests puis `src/app/api/admin/journal/[id]/publier/route.ts` : recontrôle serveur par `verifierPublication` → 422 `{ error, alertes }` sans écriture ; sinon enregistre, `statut = publiee`, fixe `slug` (`slugLibre`) et `publieeAt` s'ils sont nuls, trace `PUBLISH_POST` ou `UPDATE_POST` avec les **identifiants** de règles levées (jamais d'extrait), `revalidatePath('/journal')` et `revalidatePath('/journal/<slug>')` en best-effort — `src/app/api/admin/journal/[id]/publier/__tests__/route.test.ts` (dont : e-mail présent + `levees` complètes → 422 ; `reglesRelues: false` → 422 ; republication conserve `publieeAt` et `slug`)
- [ ] T013 [P] [US2] Tests puis `src/app/api/admin/journal/[id]/depublier/route.ts` (publiée → brouillon, trace `UNPUBLISH_POST`, revalidation ; 409 si déjà brouillon) — `src/app/api/admin/journal/[id]/depublier/__tests__/route.test.ts`

**Checkpoint** : le cycle complet passe par l'API ; aucun chemin de publication ne contourne `verifierPublication`.

---

## Phase 4: Prototype (gate V — bloque les phases 5 à 7)

- [ ] T014 Prototype HTML aux vrais tokens (Artifact), clair/sombre, 390 px et 1280 px : liste `/journal` (avec et sans publication), page d'une publication, écran de rédaction avec règles visibles, alertes (une bloquante, deux levables) et case « règles relues » ; emplacement du point d'entrée connecté — **validation opérateur avant T015**

---

## Phase 5: User Story 1 — lire les nouvelles (P1) 🎯

**Goal**: n'importe qui lit la liste et chaque publication, sans compte, sans JavaScript ; le HTML est le même pour tous.

**Independent Test**: quickstart.md § 2.

- [ ] T015 [P] [US1] Garde de source `src/__tests__/journal-sans-session.test.ts` : les fichiers de `src/app/journal/**` ne contiennent ni `getServerSession`, ni `cookies(`, ni `headers(`, ni `useSession`, ni `'use client'` au niveau page, et déclarent `export const dynamic = 'force-static'` (research R1) — écrite **avant** T017
- [ ] T016 [P] [US1] Tests puis composants de rendu `src/components/journal/TexteJournal.tsx` (arbre de `analyser()` → éléments React, liens externes `rel="noopener noreferrer nofollow"`, aucun `dangerouslySetInnerHTML`) et `src/components/journal/CarteJournal.tsx` (titre, date longue française, extrait) — `src/components/journal/__tests__/TexteJournal.test.tsx` (`<script>` affiché en texte) et `CarteJournal.test.tsx` ; + `src/components/ui/Prose.tsx` si validé en T002
- [ ] T017 [US1] `src/app/journal/page.tsx` : `force-static`, `revalidate = 3600`, lecture des publiées (`publieeAt` desc, limite 50), `SiteNavView variant="guest"` + `SiteShell` largeur validée au prototype, état vide (FR-001, scénario 4), métadonnées de la liste — test de rendu `src/app/journal/__tests__/page.test.tsx` (brouillon jamais listé)
- [ ] T018 [US1] `src/app/journal/[slug]/page.tsx` : `force-static`, `revalidate = 3600`, `generateMetadata` Open Graph (`article`, `publishedTime`), `notFound()` pour slug inconnu/brouillon, signature « L'équipe Libre » — `src/app/journal/[slug]/__tests__/page.test.tsx`
- [ ] T019 [P] [US1] `src/app/sitemap.ts` asynchrone : `/journal` + chaque publication publiée (`lastModified` = `modifieeAt`) ; lecture en échec → sitemap statique inchangé (best-effort) — test existant étendu ou `src/app/__tests__/sitemap.test.ts`

**Checkpoint** : US1 démontrable seule (publication insérée par l'API de la phase 3).

---

## Phase 6: User Story 2 + 3 côté admin — l'écran de rédaction (P1)

**Goal**: rédiger, prévisualiser à l'identique, voir les règles et les alertes, lever, cocher, publier ; dépublier.

**Independent Test**: quickstart.md § 1 et § 3 à la souris.

- [ ] T020 [US2] Tests puis `src/components/admin/JournalEditeur.tsx` : champs titre/corps, enregistrement du brouillon, aperçu rendu par `TexteJournal` (FR-010), panneau des règles toujours visible (lu dans `regles.ts`, FR-014), contrôle à la demande et avant publication, alertes avec extrait + règle, **bloquante sans case**, case de levée par alerte levable, case « J'ai relu les règles », bouton Publier inactif tant que tout n'est pas satisfait, rappel « le contrôle assiste, il ne remplace pas la relecture » (FR-020), affichage d'un 422 serveur — `src/components/admin/__tests__/JournalEditeur.test.tsx`
- [ ] T021 [US2] Pages admin `src/app/(admin)/admin/journal/page.tsx` (liste : titre, statut, dates ; nouveau brouillon) et `src/app/(admin)/admin/journal/[id]/page.tsx` (éditeur ; Dépublier pour une publiée ; Supprimer pour un brouillon jamais publié) ; entrée « Journal » dans la nav de `src/app/(admin)/layout.tsx` à côté de « Retours »

**Checkpoint** : US1 + US2 + US3 livrables — le MVP est complet sans les points d'entrée.

---

## Phase 7: User Story 4 — trouver la page, et l'interrupteur (P2)

**Goal**: un lien stable côté public et côté connecté, sans badge ; l'interrupteur des commentaires coupé par défaut dans l'admin.

**Independent Test**: quickstart.md § 4 ; un clic depuis la nav publique et depuis l'app mène à `/journal`.

- [ ] T022 [P] [US4] Lien « Journal » dans `src/components/ui/SiteNav.tsx` variante guest (à côté de « Manifeste ») + test du composant existant étendu ; `no-unread-count.test.ts` reste vert
- [ ] T023 [P] [US4] Accès connecté à l'emplacement validé en T014 (par défaut : entrée dans `src/app/(main)/settings/page.tsx`) + test
- [ ] T024 [US4] FR-023 : `src/components/admin/FeatureSwitches.tsx` affiche `journal_comments` (copie « à venir ») ; `src/app/api/admin/features/route.ts` écrit les deux colonnes et journalise `SET_FEATURES` ; `gardeFeature('journal_comments')` disponible dans `src/lib/features-server.ts` — tests existants étendus (`features-gardes.test.ts` inchangé : aucune route nouvelle n'en dépend encore)

---

## Phase 8: Polish & validation

- [ ] T025 Quickstart complet sur l'app servie (PostgreSQL local `libre_local_007`, jamais Neon) : § 1 à § 4, dont le `diff` du HTML anonyme vs connecté (SC-002) et le 422 rejoué à la main ; nettoyer base et scripts jetables
- [ ] T026 Captures Playwright clair/sombre, 390 px et 1280 px (liste, publication, état vide, éditeur avec alertes) ; échantillonnage multi-points du bloc d'alertes et du bouton Publier ; aucun défilement horizontal (titre long, mot sans espace)
- [ ] T027 Gates : `npx vitest run`, `npx tsc --noEmit`, `npx eslint` sur les fichiers touchés ; PR `Closes #351` (brouillon dès le premier push, `ready` à la fin) ; cocher T001–T027 ici
- [ ] T028 Rédiger avec l'opérateur les trois premières publications (mise à jour · conseils anti-arnaque côté victime · « plus de 100 inscrits », chiffre vérifié en lecture seule avant) — **publiées par l'opérateur, jamais par l'agent** (FR-013)

---

## Dependencies & Execution Order

- **Phase 1** → **Phase 2** (T003 avant tout ; T004–T006 et T008 en parallèle ; T007 après T006).
- **Phase 3** dépend de la phase 2 ; T012 dépend de T007 et T005.
- **Phase 4 (prototype)** peut se préparer dès la phase 2, mais **bloque** les phases 5 à 7.
- **Phase 5** (US1) ne dépend que de la phase 2 et de T014 ; **Phase 6** dépend des phases 3 et 5 (T016 pour l'aperçu).
- **Phase 7** dépend de T014 (emplacements) ; T024 dépend de T008.
- **Phase 8** en dernier ; T028 après le merge et le déploiement.

## Parallel Opportunities

- Phase 2 : T004 · T005 · T006 · T008 ensemble (fichiers distincts).
- Phase 3 : T009 · T010 · T011 · T013 ensemble, puis T012.
- Phase 5 : T015 · T016 · T019 ensemble, puis T017 → T018.
- Phase 7 : T022 · T023 ensemble, T024 à part.

## Implementation Strategy

1. **Fondations + serveur d'abord** (phases 2–3) : toute la sécurité du lot est dans la logique pure et le recontrôle serveur, testables sans pixel. C'est aussi ce qui se relit le mieux.
2. **Prototype** pendant que la CI tourne ; rien d'interface avant le go.
3. **US1 puis l'éditeur** : la page publique est démontrable avec une publication créée par l'API ; l'éditeur arrive ensuite.
4. **Points d'entrée et interrupteur** en dernier : sans eux le MVP fonctionne déjà par lien direct.
5. Une seule PR brouillon, un commit par tâche verte, `gh pr ready` quand T027 est vert.
