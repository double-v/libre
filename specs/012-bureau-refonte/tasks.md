# Tasks: Refonte du bureau de modération et vérification par code manuscrit

**Input**: Design documents from `/specs/012-bureau-refonte/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md, proto-bureau.html

**Tests**: oui, en TDD, selon la **doctrine anti-complaisance** de `plan.md` : rouge prouvé, effets vérifiés plutôt qu'appels, vrai PostgreSQL pour le SQL, cas hostiles de `securite.md`, contrôle par mutation. Les tâches ajoutées après la revue de sécurité portent un suffixe (T003a…) pour garder les numéros cités dans les issues.

**Organization**: une phase par user story ; une user story = une issue = une PR (ou un lot, cf. plan).

## Format: `[ID] [P?] [Story] Description`

- **[P]** : parallélisable (fichiers distincts, aucune dépendance en cours)
- **[Story]** : US1 à US8 de spec.md

---

## Phase 1: Setup

- [ ] T001 Lire `AGENTS.md` (Next 16 : cache, `after()`, `redirects`) et noter les écarts avec research.md R7/R10 dans `specs/012-bureau-refonte/research.md`
- [ ] T002 [P] Créer le seed de démonstration factice (2 ADMIN « Toi » et « Sam », ~15 membres couvrant chaque type de cas du prototype) dans `prisma/seed-bureau-012.ts`, jamais exécuté contre Neon

---

## Phase 2: Foundational

- [ ] T003 Extraire la logique des gestes unitaires existants (signalement, vérification, réponse, photo, indice, ban, suppression) en fonctions sans HTTP qui écrivent l'effet et la ligne de journal, dans `src/lib/moderation/gestes.ts`, et faire appeler ces fonctions par les routes `src/app/api/admin/{reports/[id],verifications/[id],answers/[id],users/[id],users/[id]/photos,indices/*}/route.ts`. Tests de non-régression : effet et ligne de journal identiques avant et après, dans `src/lib/moderation/__tests__/gestes.test.ts`
- [x] T003a Harnais d'intégration : projet Vitest `integration` sur un PostgreSQL réel (migrations appliquées, base vidée entre fichiers), en local et en CI via un conteneur de service `postgres` isolé, jamais Neon, dans `vitest.config.ts`, `src/test/integration-setup.ts` et `.github/workflows/ci.yml` — livré par #548 (PR #554) : `tests/integration/`, `npm run test:db`, service `postgres` en CI.
- [x] T003b Garde admin fermée par défaut pour les nouvelles routes (rôle relu en base, 404 si la base ne répond pas, FR-S07), avec ses tests d'intégration (rôle rétrogradé avec JWT encore ADMIN → 404 ; base coupée → 404), dans `src/lib/admin.ts` (`requireAdminStrict`) et `src/lib/__tests__/admin-strict.test.ts` — livré par #547 (PR #554) : `estAdminEnBase`, garde fermée, sans nouveau nom de fonction.
- [ ] T003c Contrôle d'origine et de type de contenu des écritures admin (FR-S08), avec ses tests (Origin absente, étrangère, `text/plain` → 403), dans `src/lib/securite/origine.ts` et `src/lib/securite/__tests__/origine.test.ts`

**Checkpoint** : les routes actuelles se comportent à l'identique ; les stories peuvent commencer.

---

## Phase 3: User Story 1 — Selfie avec un code écrit à la main (P1) 🎯 MVP · #538

**Goal** : le geste est remplacé par un code de quatre chiffres tiré et révoqué par le serveur ; la modération voit le code attendu, l'indice de lecture et trois questions.

**Independent Test** : quickstart scénarios 1 et 2.

### Tests (écrits d'abord, doivent échouer)

- [x] T004 [P] [US1] Tests de `tirerCode` (alphabet 2–9, 4 chiffres, révocation du précédent, expiration 30 min) et `codeValide` dans `src/lib/verification/__tests__/code.test.ts`
- [x] T005 [P] [US1] Tests de `normaliserCodeLu` (extrait 4 chiffres, `''` si aucun) et du marquage des caractères divergents dans `src/lib/verification/__tests__/lecture-code.test.ts`
- [x] T006 [P] [US1] Tests de route : tirage 200/409, selfie avec code expiré, remplacé ou d'un autre membre → 410, bon code → 201 et ligne `verification_codes` effacée, dans `src/app/api/moderation/verify/__tests__/code.test.ts` (`// @vitest-environment node`)
- [x] T006a [P] [US1] Tests hostiles : compte non confirmé ou banni → refus du tirage (FR-S01) ; rafale de tirages ou d'envois par compte et par IP → 429 (FR-S02) ; image de plus de 5 Mo, image géante en pixels, faux JPEG polyglotte → refus (FR-S03) ; GPS présent dans le fichier envoyé → absent de l'objet stocké, booléen « sans données d'appareil » juste (FR-S04) ; aucune réponse membre ne contient `code_lu` (FR-S05) ; aucune route membre n'accepte d'identifiant (FR-S06). Dans `src/app/api/moderation/verify/__tests__/hostile.test.ts`

### Implementation

- [x] T007 [US1] Ajouter au schéma `VerificationCode` et les colonnes `code_attendu`, `code_lu`, `tentative` de `VerificationRequest`, avec la migration additive à la main `prisma/migrations/<date>_verification_code/migration.sql`, dans `prisma/schema.prisma` (data-model.md)
- [x] T008 [US1] Implémenter `tirerCode`, `codeValide`, `consommerCode` dans `src/lib/verification/code.ts`
- [x] T009 [US1] Implémenter `lireCode(image)` au-dessus de `lireTexte` (liste blanche `23456789`) et `normaliserCodeLu` dans `src/lib/verification/lecture-code.ts`
- [x] T010 [US1] Créer `POST /api/moderation/verify/code` (contrat `contracts/api.md`) dans `src/app/api/moderation/verify/code/route.ts`
- [x] T011 [US1] Modifier `POST /api/moderation/verify` : accepter `code`, refuser 410, écrire `code_attendu` et `tentative`, planifier `lireCode` dans `after()` pour écrire `code_lu`, dans `src/app/api/moderation/verify/route.ts`
- [x] T012 [US1] Réécrire les motifs (code, personne, écran, visage) avec un conseil par motif, et garder l'ancienne clé `geste_invisible` lisible pour l'historique, dans `src/lib/verification/motifs.ts`
- [x] T013 [US1] Page membre : affichage du code, consignes en phrases complètes (feuille tenue ou posée, « quelqu'un peut l'écrire pour toi »), capture `capture="user"`, d'après `proto-bureau.html` (Outils › Proto selfie), dans `src/app/(main)/verify/page.tsx`
- [x] T014 [US1] Carte admin de vérification : code attendu, indice de lecture (en cours, impossible, divergences soulignées), photos du profil, trois questions, et ancien geste si `challenge` sans `code_attendu` (FR-008), dans `src/components/AdminVerificationCard.tsx`
- [x] T015 [US1] Ajouter `verification_codes` aux champs privés de `src/__tests__/city-label-never-leaks.test.ts`
- [x] T016 [US1] Retirer `geste/route.ts`, `gestes.ts` et `jeton-geste.ts` une fois T010 à T014 verts, dans `src/app/api/moderation/verify/geste/` et `src/lib/verification/`

**Checkpoint** : un membre de test passe la vérification de bout en bout avec un code.

---

## Phase 4: User Story 2 — Après un refus, toujours une suite (P1) · #539

**Goal** : motif, conseil et nouveau code après un refus ; 24 h d'attente seulement après trois refus.

**Independent Test** : quickstart scénarios 3 et 4.

### Tests

- [x] T017 [P] [US2] Tests de `peutTirer` (0, 1, 2, 3 refus, validation intercalée, 24 h pile) dans `src/lib/verification/__tests__/code.test.ts`
- [x] T018 [P] [US2] Tests du push `verification` : charge sans motif ni nom, dans `src/lib/push/__tests__/server.test.ts`
- [x] T018a [P] [US2] Tests d'intégration de `peutTirer` sur PostgreSQL : demandes réelles, bornes à 24 h moins 1 s et plus 1 s, deux tirages concurrents → un seul code valable, dans `src/lib/verification/__tests__/code.integration.test.ts`

### Implementation

- [x] T019 [US2] Implémenter `peutTirer` et l'appliquer dans la route de tirage (429 `reessaiAt`) dans `src/lib/verification/code.ts` et `src/app/api/moderation/verify/code/route.ts`
- [x] T020 [US2] Étendre `statutVerification` (motif `{ cle, texte, conseil }`, `reessaiAt`, `tentative`) dans `src/lib/verification/statut.ts`
- [x] T021 [US2] Ajouter le `PushKind` `verification` et l'envoyer dans `after()` au refus et à la validation, dans `src/lib/push/server.ts` et `src/app/api/admin/verifications/[id]/route.ts`
- [x] T022 [US2] Repère de présence sur la roue dentée quand un refus n'a pas été vu, dans `src/hooks/useVerificationStatut.ts` et `src/components/SiteNav.tsx`
- [x] T023 [US2] Écran de refus (motif, conseil, nouveau code, « Refaire mon selfie », date de reprise) dans `src/app/(main)/verify/page.tsx`
- [x] T024 [US2] Carte admin : « tentative n° N » et motif du refus précédent, dans `src/components/AdminVerificationCard.tsx`

**Checkpoint** : aucun refus ne laisse le membre sans action possible.

---

## Phase 5: User Story 3 — Membres, le point d'entrée (P1) · #540

**Goal** : liste filtrable, triable, cherchable, état dans l'adresse, mobile d'abord.

**Independent Test** : quickstart scénario 5.

### Tests

- [ ] T025 [P] [US3] Tests de `src/lib/moderation/cas.ts` (gravité, tri urgence puis ancienneté, filtres) dans `src/lib/moderation/__tests__/cas.test.ts`
- [ ] T026 [P] [US3] Tests de route `GET /api/admin/membres` (filtres, tri, recherche, curseur, compteurs, refus non-admin) dans `src/app/api/admin/membres/__tests__/route.test.ts`
- [ ] T026a [P] [US3] Tests hostiles de `GET /api/admin/membres` sur PostgreSQL : non-admin → 404, recherche `%`, `_`, `'` et `\\` traitées littéralement, curseur forgé ou tronqué → 400, aucune colonne privée hors liste blanche dans la réponse (FR-S07, FR-S14), dans `src/app/api/admin/membres/__tests__/hostile.integration.test.ts`

### Implementation

- [ ] T027 [US3] Proposer dans `DESIGN.md` : `SeverityStripe`, `CaseTag`, `MembreRow`, la mise en page liste | fiche et ses seuils (360 / 900 px), d'après `proto-bureau.html`
- [ ] T028 [US3] Implémenter les cas dérivés et le tri (pur) dans `src/lib/moderation/cas.ts`
- [ ] T029 [US3] Implémenter `GET /api/admin/membres` (SQL, curseur, compteurs `UNION ALL`) dans `src/app/api/admin/membres/route.ts`
- [ ] T030 [US3] Remplacer `countAdminQueues` par les compteurs de T029 dans `src/lib/admin-queues.ts`, `src/app/(admin)/layout.tsx` et `src/app/api/admin/queues/route.ts`
- [ ] T031 [P] [US3] Composants `SeverityStripe` et `CaseTag` dans `src/components/ui/`, et `MembreRow` dans `src/components/admin/MembreRow.tsx`
- [ ] T032 [US3] Page hub (recherche, filtres en puces avec compteurs, tri, chargement par pages, état dans l'adresse, volet fiche vide pour l'instant) dans `src/app/(admin)/admin/membres/page.tsx`
- [ ] T033 [US3] E2E : filtre → fiche → retour → rechargement à 360 et 1280 px, sans défilement horizontal, dans `e2e/admin-membres.spec.ts`

**Checkpoint** : le hub liste et filtre ; les gestes passent encore par les anciennes pages.

---

## Phase 6: User Story 4 — La fiche membre et ses gestes guidés (P1) · #541

**Goal** : tous les cas d'un membre se tranchent depuis sa fiche, avec repères et « Le membre verra ».

**Independent Test** : quickstart scénarios 6 et 7.

### Tests

- [ ] T034 [P] [US4] Tests de `src/lib/moderation/reperes.ts` (un repère et un « le membre verra » par geste, aucun manquant) dans `src/lib/moderation/__tests__/reperes.test.ts`
- [ ] T035 [P] [US4] Tests de route `GET /api/admin/membres/[id]` (sections, historique avec auteur ou « automatique », aucun champ privé d'autrui en trop) dans `src/app/api/admin/membres/[id]/__tests__/route.test.ts`
- [ ] T035a [P] [US4] Test de garde XSS : aucun `dangerouslySetInnerHTML` dans `src/components/admin/` ni `src/app/(admin)/` (lint ou test statique), et un pseudo `<img src=x onerror=…>` rendu comme texte dans `CaseCard` et `FicheMembre` (FR-S15), dans `src/components/admin/__tests__/xss.test.tsx`
- [ ] T035b [P] [US4] Tests de `DELETE /api/admin/membres/[id]` : pseudo ressaisi faux → 400 sans effet, Origin étrangère → 403, journal sur le compte gardé selon la règle existante (FR-S11), dans `src/app/api/admin/membres/[id]/__tests__/delete.integration.test.ts`

### Implementation

- [ ] T036 [US4] Proposer dans `DESIGN.md` : `CaseCard`, `FicheMembre`, `BottomSheet` (confirmation à motif), d'après `proto-bureau.html`
- [ ] T037 [US4] Repères et textes « Le membre verra », source unique, dans `src/lib/moderation/reperes.ts`
- [ ] T038 [US4] Implémenter `GET /api/admin/membres/[id]` dans `src/app/api/admin/membres/[id]/route.ts`
- [ ] T039 [P] [US4] `BottomSheet` dans `src/components/ui/BottomSheet.tsx` (piège du focus, Échap, cible 44 px, mouvement réduit)
- [ ] T040 [US4] `CaseCard` par type (selfie réutilisant T014/T024, signalement, photo, réponse, indice avec compte lié) dans `src/components/admin/CaseCard.tsx`
- [ ] T041 [US4] `FicheMembre` (identité, cas, fiabilité, photos, historique, autres gestes, zone sensible) branchée sur les routes unitaires existantes, dans `src/components/admin/FicheMembre.tsx` et `src/app/(admin)/admin/membres/page.tsx`
- [ ] T042 [US4] Redirections `/admin/reports`, `/admin/verifications`, `/admin/indices`, `/admin/profils`, `/admin/users(/[id])` vers le hub (research.md R10) dans `next.config.ts`, et URL des pushs admin dans `src/lib/push/server.ts`
- [ ] T043 [US4] E2E : bannir depuis la fiche (motif exigé, journal identique), ouvrir un compte lié, dans `e2e/admin-fiche.spec.ts`

**Checkpoint** : les anciennes files ne servent plus ; tout part du hub.

---

## Phase 7: User Story 5 — Des gestes instantanés, sûrs à deux (P2) · #542

**Goal** : gestes optimistes annulables, envoyés par lots idempotents, « déjà traité par X », « ouvert par X ».

**Independent Test** : quickstart scénarios 8 et 9.

### Tests

- [ ] T044 [P] [US5] Tests de `appliquerLot` (rejeu d'une clé, déjà traité avec auteur, cas clos, échec isolé, 1 à 20 gestes) dans `src/lib/moderation/__tests__/gestes-lot.test.ts`
- [ ] T045 [P] [US5] Tests de `useGestes` (annulation à 5 s, regroupement, `pagehide`, reprise depuis `localStorage`) dans `src/hooks/__tests__/useGestes.test.ts`
- [ ] T045a [P] [US5] Tests hostiles et de concurrence de `POST /api/admin/gestes` sur PostgreSQL : même lot envoyé deux fois en parallèle → un seul effet ; même clé avec un contenu différent → `echec` sans effet (FR-S10) ; cas d'un autre membre que `membreId` → refus (FR-S09) ; 21 gestes → 400 ; `supprimer` dans un lot → 400 ; 11ᵉ bannissement dans l'heure → `plafond` et ligne de journal (FR-S11) ; `text/plain` ou Origin étrangère → 403 (FR-S08). Dans `src/app/api/admin/gestes/__tests__/hostile.integration.test.ts`
- [ ] T045b [P] [US5] Tests de `useGestes` : un geste dans son délai n'est pas envoyé au `pagehide` (FR-S12) ; le stockage local ne contient ni pseudo ni texte, et il est vidé à la déconnexion (FR-S13). Dans `src/hooks/__tests__/useGestes.securite.test.ts`

### Implementation

- [ ] T046 [US5] Ajouter `moderation_logs.cle` (unique, nullable) et la table `admin_cas_ouverts`, avec la migration additive, dans `prisma/schema.prisma` et `prisma/migrations/<date>_gestes_lot/migration.sql`
- [ ] T047 [US5] Implémenter `appliquerLot` au-dessus des fonctions de T003 (écritures conditionnelles, effets dans `after()`) dans `src/lib/moderation/gestes-lot.ts`
- [ ] T048 [US5] Créer `POST /api/admin/gestes` dans `src/app/api/admin/gestes/route.ts`
- [ ] T049 [US5] Écrire et lire `admin_cas_ouverts` (fenêtre 10 min) dans `src/app/api/admin/membres/[id]/route.ts`
- [ ] T050 [US5] Proposer dans `DESIGN.md` `SyncIndicator` et `UndoToast` (ou l'extension du toast existant)
- [ ] T051 [US5] Implémenter `useGestes` dans `src/hooks/useGestes.ts`, `SyncIndicator` dans `src/components/admin/SyncIndicator.tsx`, `UndoToast` dans `src/components/ui/UndoToast.tsx`
- [ ] T052 [US5] Brancher `FicheMembre` sur `useGestes` (mise à jour immédiate, « Cas suivant », issues « déjà traité » et « cas clos ») dans `src/components/admin/FicheMembre.tsx`
- [ ] T053 [US5] E2E : trois gestes, une annulation, coupure réseau, deux admins sur un même cas, dans `e2e/admin-gestes.spec.ts`

---

## Phase 8: User Story 6 — Sanctions graduées (P2) · #543

**Goal** : avertir et masquer, chacun avec sa suite ; bandeaux après retrait de photo ou de réponse.

**Independent Test** : quickstart scénarios 10 et 11.

### Tests

- [ ] T054 [P] [US6] Tests des routes avertissement (GET le plus ancien non lu, POST idempotent) dans `src/app/api/moderation/avertissement/__tests__/route.test.ts`
- [ ] T055 [P] [US6] Tests du masquage : Découvrir exclut `masque_jusqua > now()`, l'échéance le lève, relecture 201/409, dans `src/app/api/discover/__tests__/masquage.test.ts` et `src/app/api/moderation/relecture/__tests__/route.test.ts`
- [ ] T056 [P] [US6] Ajouter `masque_jusqua`, `masque_motif`, `relecture_demandee_at` et `avertissements` aux champs privés de `src/__tests__/city-label-never-leaks.test.ts`
- [ ] T056a [P] [US6] Tests hostiles : seconde relecture pour un même masquage → 409, rafale → 429 (FR-S16) ; un membre ne lit ni n'acquitte l'avertissement d'un autre (FR-S06), dans `src/app/api/moderation/__tests__/sanctions-hostile.integration.test.ts`

### Implementation

- [ ] T057 [US6] Ajouter `Avertissement` et les colonnes de masquage à `User`, avec la migration additive, dans `prisma/schema.prisma` et `prisma/migrations/<date>_sanctions_graduees/migration.sql`
- [ ] T058 [US6] Liste fermée des avertissements dans `src/lib/moderation/avertissements.ts`, et gestes `avertir`, `masquer`, `rendre_visible`, `maintenir` dans `src/lib/moderation/gestes.ts` et `gestes-lot.ts`
- [ ] T059 [US6] Routes membre `GET /api/moderation/avertissement`, `POST …/[id]/lu`, `POST /api/moderation/relecture` dans `src/app/api/moderation/`
- [ ] T060 [US6] Exclure les profils masqués de Découvrir à côté de `retraitAt` dans `src/app/api/discover/route.ts`
- [ ] T061 [US6] Cas dérivé `relecture` dans `src/lib/moderation/cas.ts` et `src/app/api/admin/membres/route.ts`
- [ ] T062 [US6] Côté membre : avertissement affiché une fois au montage du shell connecté, bandeau de masquage avec date de fin et « Demander une relecture », dans `src/components/ModerationNotice.tsx` et `src/app/(main)/layout.tsx`
- [ ] T063 [US6] Bandeaux après retrait ou voile de photo et après retrait de réponse, avec l'action suivante (ajouter une photo, écrire une autre réponse), dans `src/components/RetraitNotice.tsx`

---

## Phase 9: User Story 7 — L'activité de Libre, racontée (P2) · #544

**Goal** : onglet Activité en récit, agrégats existants seulement, mis en cache.

**Independent Test** : quickstart scénario 12.

### Tests

- [ ] T064 [P] [US7] Tests de `recit.ts` (hausse, baisse, stable sous 3 %, accords à 0, 1, n, chapitre sans arrivée) dans `src/lib/activite/__tests__/recit.test.ts`
- [ ] T065 [P] [US7] Tests de `agregats.ts` sur une base factice : chaque série égale à un calcul indépendant pour 7, 30 et 90 j, dans `src/lib/activite/__tests__/agregats.test.ts`
- [ ] T065a [P] [US7] Tests de `GET /api/admin/activite` : non-admin → 404 même quand la période est déjà en cache, en-tête `Cache-Control: private, no-store` (FR-S17), aucun identifiant ni pseudo dans le corps, dans `src/app/api/admin/activite/__tests__/route.integration.test.ts`

### Implementation

- [ ] T066 [US7] Proposer dans `DESIGN.md` : `StoryLede`, `PeopleDots`, `SoftLine`, `SoftBars`, `TimeBubbles`, `TenPeople`, et le token abricot s'il manque, d'après `proto-bureau.html` (onglet Activité)
- [ ] T067 [US7] Implémenter les agrégats SQL (arrivées, avancée, présence, moments sur `messages.createdAt` Europe/Paris, restent, taux de réponse, démographie reprise de `stats/route.ts`, soin, repères du journal) dans `src/lib/activite/agregats.ts`
- [ ] T068 [US7] Créer `GET /api/admin/activite` avec cache de 10 min par période (selon T001) dans `src/app/api/admin/activite/route.ts`
- [ ] T069 [US7] Implémenter les phrases dans `src/lib/activite/recit.ts`
- [ ] T070 [P] [US7] Graphiques SVG (`SoftLine` avec repères, `SoftBars`, `PeopleDots`, `TimeBubbles`, `TenPeople`), info-bulle au toucher, « Voir les chiffres », libellés accessibles, dans `src/components/admin/recit/`
- [ ] T071 [US7] Page Activité en chapitres, avec le sélecteur Semaine / Mois / Trimestre et le bloc « Quelques personnes attendent ton regard », dans `src/app/(admin)/admin/page.tsx`
- [ ] T072 [US7] Retirer `AnalyticsSection` et `MetricCard` s'ils ne servent plus, dans `src/components/admin/`

---

## Phase 10: User Story 8 — Retours et outils dans la nouvelle navigation (P3) · #545

**Goal** : quatre entrées, Retours et Outils rhabillés, Guide de modération, anciennes adresses redirigées.

**Independent Test** : quickstart scénario 13.

### Tests

- [ ] T073 [P] [US8] Test : chaque ancienne adresse admin redirige vers son équivalent (tableau R10), dans `src/__tests__/admin-redirections.test.ts`

### Implementation

- [ ] T074 [US8] Navigation à quatre entrées (onglets en bas sous 900 px, en-tête au-delà, compteurs de travail) dans `src/app/(admin)/layout.tsx`
- [ ] T075 [US8] Page Retours (réponse préremplie quand possible, retours anonymes marqués lus) dans `src/app/(admin)/admin/retours/page.tsx`
- [ ] T076 [US8] Outils : déplacer historique, place, cercle, journal, fonctions, apparence, limites, rétention sous `src/app/(admin)/admin/outils/[outil]/page.tsx`, avec une navigation par puces
- [ ] T077 [US8] Guide de modération lu depuis `src/lib/moderation/reperes.ts`, dans `src/app/(admin)/admin/outils/guide/page.tsx`
- [ ] T078 [US8] Redirections restantes (feedback, logs, outils) dans `next.config.ts`

---

## Phase 11: Polish & Cross-Cutting

- [ ] T079 Gate visuel : captures Playwright à 360, 768 et 1280 px, en clair et en sombre, de chaque écran listé dans `quickstart.md`, comparées à `proto-bureau.html` ; recouvrements mesurés en plusieurs points
- [ ] T080 [P] Mettre à jour `CLAUDE.md` (sections Sécurité et Notifications : champs privés, push `verification`, hub admin) et `DESIGN.md` (statut « livré » des composants)
- [ ] T081 [P] Politique de confidentialité : selfie avec code, lecture automatique locale, avertissements et masquage, dans `src/app/(legal)/confidentialite/page.tsx`
- [ ] T082 Gates locaux `npx vitest run`, `npx tsc --noEmit`, `npx eslint src` avant chaque PR
- [ ] T083 Revue de chaque PR selon `plan.md` (« Revue avant chaque PR ») : `/code-review high`, `/security-review` avec la correspondance menace → test, `/revue-metier` pour US1/US2/US5/US6, mutations consignées pour les modules critiques, preuve du rouge initial
- [ ] T084 Vérifier qu'aucune dépendance n'a été ajoutée (`git diff main -- package.json package-lock.json` vide, FR-S18)

---

## Dependencies & Execution Order

- **Setup (T001–T002)** → **Foundational (T003)** → stories.
- **US1** → **US2** (même écran membre, même module `code.ts`).
- **US3** → **US4** → **US5** → **US6** (le hub, puis la fiche, puis les lots, puis les nouveaux gestes).
- **US4** → **US8** (`reperes.ts` partagé avec le Guide ; redirections).
- **US7** est indépendante (seulement T001).
- Polish après les stories livrées.

## Parallel Opportunities

- US1 et US3 peuvent avancer en parallèle après T003 (fichiers disjoints).
- US7 peut avancer en parallèle de tout le reste.
- Dans chaque story, les tâches de test [P] s'écrivent ensemble.
- T031, T039 et T070 (composants) en parallèle de leurs routes.

## Implementation Strategy

1. **MVP = US1 + US2** (lot 1) : la vérification par code est livrable seule et répond au besoin le plus urgent.
2. **Lot 2 = US3 + US4** : le hub remplace les files.
3. **Lot 3 = US5 + US6** : la vitesse et les sanctions graduées.
4. **Lot 4 = US7 + US8** : le récit d'activité et la reprise des outils.

Chaque lot est une branche tampon et une PR qui ferme ses issues (préférence de l'opérateur). Merge par l'opérateur seul.
