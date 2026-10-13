# Tasks: Bureau de modération

**Input**: Design documents from `/specs/011-bureau-moderation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: TDD — chaque module pur (`presence`, `grappes`, `gestes`, `suggererDomaine`,
échéances de purge, `useFiltresUrl`) a son test en tableau avant le code. Données
factices uniquement (règle « données de membres hors IA »).

**Organization**: une phase par user story, dans l'ordre de livraison du plan
(US1 → US2 → US3 → US4 → US5 → US6). Une issue GitHub par story.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [ ] T001 Écrire la migration additive à la main dans `prisma/migrations/<horodatage>_presence_cycle_de_vie/migration.sql` : `users.last_seen_at DATE NULL`, `users.preavis_inactivite_at TIMESTAMP(3) NULL`, index sur `last_seen_at`, amorçage `UPDATE users SET last_seen_at = CURRENT_DATE WHERE "emailVerified" IS NOT NULL` ; reporter dans `prisma/schema.prisma` (`lastSeenAt DateTime? @db.Date @map("last_seen_at")`, `preavisInactiviteAt DateTime? @map("preavis_inactivite_at")`, `@@index([lastSeenAt])`) puis `npx prisma generate`
- [ ] T002 Valider la migration sur une base PostgreSQL **locale** (`createdb -T`, `psql -f`) avant tout push — irréversible au premier deploy de preview
- [ ] T003 [P] Étendre le seed factice local (`prisma/seed*.ts` ou script de quickstart) : doublon même `deviceId` (un vérifié, un non), deux comptes à photo partagée, trois inscriptions même IP, comptes vérifiés à J-100 / J-340 / J-370 avec préavis J-31, compte non vérifié à J-31

## Phase 2: Foundational

- [ ] T004 Ajouter `lastSeenAt` et `preavisInactiviteAt` à la garde de non-fuite `src/__tests__/city-label-never-leaks.test.ts` (aucune route lue par autrui, aucune charge push) — le test doit échouer si un `select` les expose

**Checkpoint**: schéma et garde en place.

## Phase 3: User Story 1 — Présence réelle (P1) 🎯 MVP

**Goal**: un membre qui revient sans rien modifier est compté présent ce jour-là (#498).
**Independent Test**: quickstart scénario 1.

- [ ] T005 [P] [US1] Test puis code `src/lib/presence.ts` : `jourDePresence(now)` (borne Europe/Paris, réutiliser `borneDuJour` de `src/lib/retention/purge.ts`), `doitEcrirePresence(lastSeenAt, now)` (null ou jour antérieur → vrai) (test `src/lib/__tests__/presence.test.ts`)
- [ ] T006 [US1] `src/proxy.ts` : ajouter `lastSeenAt` au `select` du contrôle utilisateur et au `UserCheck` mis en cache ; si `doitEcrirePresence`, `updateMany({ where: { id, OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: jour } }] }, data: { lastSeenAt: jour, preavisInactiviteAt: null } })`, mettre à jour l'entrée du cache, erreur journalisée `presence.failed` sans identifiant, jamais bloquante ; tests dans `src/__tests__/proxy*.test.ts` (2 navigations le même jour → 1 écriture ; jour suivant → 1 écriture ; panne DB → navigation passe)
- [ ] T007 [US1] `src/app/api/admin/stats/route.ts` et `src/lib/admin-analytics.ts` : `actifs7j`, `actifs30j` et « revenus après J+1 » (`last_seen_at > createdAt + 1 jour`) calculés sur `lastSeenAt` ; mettre à jour les tests existants
- [ ] T008 [US1] `src/app/api/discover/route.ts` : tri par activité (« Pour toi » `sortValue`, « À proximité » `orderBy`) sur `lastSeenAt` via `select` interne, **sans** l'ajouter à la réponse ; `lastActive` reste pour `online`
- [ ] T009 [US1] Politique : mentionner la date de dernière visite (au jour près, sans historique, finalités : statistiques, Découvrir, durée de vie du compte) dans `src/app/(legal)/confidentialite/page.tsx`

**Checkpoint**: US1 livrable seule ; #498 fermée par sa PR.

## Phase 4: User Story 2 — Page Indices (P1)

**Goal**: grappes de comptes liés, côte à côte, raisons en clair, doublon probable ; remplace la file « Profils à vérifier ».
**Independent Test**: quickstart scénario 2.

- [ ] T010 [US2] **Gate visuel** : prototype HTML de `/admin/indices` (liste de grappes, filtre doublons, comparaison côte à côte, détail avec décisions de la file, barre de lot) dans `specs/011-bureau-moderation/proto-indices.html`, tokens réels, clair/sombre, 390 px et 1280 px ; publier (proto-server ou Artifact) et **attendre la validation de l'opérateur** avant T014
- [ ] T011 [P] [US2] Test puis code `src/lib/fraude/grappes.ts` : `construireGrappes(comptes, liens)` (union-find), `raisonsGrappe(grappe)` (phrases complètes, écart d'inscription en minutes/heures/jours), `doublonProbable(grappe)` (R4), tri niveau puis récence ; cas : grappe d'un compte, grappe à 3 comptes, `photo_bannie` sans regroupement, compte supprimé (`autreUserId` absent de la base) (test `src/lib/fraude/__tests__/grappes.test.ts`)
- [ ] T012 [P] [US2] Libellés des sortes de lien et des raisons dans `src/lib/fraude/libelles.ts`
- [ ] T013 [US2] `src/lib/fraude/indices-admin.ts` : charger comptes à signaux non tranchés (`signauxRecents` + `profileReview.decidedAt`), liens `ProfileSignal.autreUserId` (`appareil_partage`, `photo_reutilisee`, `texte_reutilise`) et `SignupTrace.ipHash` partagés, champs de `CompteGrappe` (data-model) ; une requête par table, calcul en mémoire
- [ ] T014 [US2] Test puis code `src/lib/moderation/gestes.ts` : extraire `deciderProfil(adminId, userId, decision, motif)` de `src/app/api/admin/profils-a-verifier/[userId]/route.ts` (la route l'appelle, tests existants inchangés et verts), ajouter `supprimerDoublon(adminId, grappe, orphelinId)` (recalcul, refus si plus doublon, si e-mail vérifié, si photos/likes/conversations ; `effacerCompte` + journal `DELETE_DUPLICATE` + `deciderProfil(…, 'rien')` sur le compte gardé)
- [ ] T015 [US2] Routes `src/app/api/admin/indices/route.ts` (GET, `filtre`, `niveau`, `page`), `src/app/api/admin/indices/[grappeId]/doublon/route.ts`, `src/app/api/admin/indices/[grappeId]/rien/route.ts` selon `contracts/api.md` ; tests de route (admin requis, 409 doublon périmé)
- [ ] T016 [US2] Composants `src/components/admin/GrappeCard.tsx` et `src/components/admin/ComparaisonComptes.tsx` conformes au prototype validé, `AdminPhotoSearch` monté sur les photos, lien vers la fiche de chaque compte ; tests Testing Library (raisons rendues, doublon → bouton de suppression, confirmation exigée)
- [ ] T017 [US2] Page `src/app/(admin)/admin/indices/page.tsx` : liste paginée, filtre doublons/niveau, détail d'une grappe avec les décisions de la file (rien, exiger, bannir, motif) ; `src/app/(admin)/admin/profils/page.tsx` devient une redirection vers `/admin/indices`
- [ ] T018 [US2] `src/lib/admin-queues.ts` + `src/app/api/admin/queues/route.ts` : clé `profils` → `indices` (grappes non tranchées) ; mettre à jour le layout et les tests
- [ ] T019 [US2] Captures Playwright `/admin/indices` (clair/sombre, 390/1280 px, plusieurs points mesurés) sur l'app servie en local

**Checkpoint**: la file « Profils à vérifier » n'existe plus que comme redirection ; aucune décision perdue.

## Phase 5: User Story 3 — Gestes par lot (P2)

**Goal**: inviter ou exiger une vérification pour jusqu'à 50 comptes, avec bilan.
**Independent Test**: quickstart scénario 3.

- [ ] T020 [US3] Proposer dans `DESIGN.md` les deux composants manquants (case à cocher, boîte de confirmation) d'après le prototype T010, puis les créer dans `src/components/ui/` avec tests (focus ring coral, cible ≥ 44 px, `prefers-reduced-motion`)
- [ ] T021 [US3] Test puis code dans `src/lib/moderation/gestes.ts` : extraire `inviterVerification(adminId, userId)` de `src/app/api/admin/users/[id]/invitation/route.ts` (route inchangée côté contrat), retour `traite | ignore(raison) | echec`
- [ ] T022 [P] [US3] Test puis code `retraitParLotPermis(userIds, grappes)` dans `src/lib/moderation/gestes.ts` : vrai si tous dans une même grappe ou tous `douteux` (clarification 2)
- [ ] T023 [US3] Route `src/app/api/admin/moderation/lot/route.ts` : validation (1–50, uuid, sans doublon), boucle compte par compte, garde serveur du retrait (403), `BilanLot` ; tests (lot mixte → bilan exact, relance idempotente, panne simulée au 3e → 2 traités + reste en échec)
- [ ] T024 [US3] `src/components/admin/BarreLot.tsx` + cases dans `GrappeCard` : sélection, gestes, confirmation avec **liste nominative** pour le retrait, affichage du bilan ; tests Testing Library (retrait masqué si garde fausse)

**Checkpoint**: 20 comptes invités en < 1 minute (SC-003).

## Phase 6: User Story 4 — Navigation « Modération » et filtres dans l'adresse (P2)

**Goal**: un point d'entrée, et des listes qui gardent leurs filtres au retour.
**Independent Test**: quickstart scénario 4.

- [ ] T025 [P] [US4] Test puis code `src/hooks/useFiltresUrl.ts` : lecture typée depuis `useSearchParams`, écriture par `router.replace(…, { scroll: false })`, valeurs par défaut absentes de l'adresse, remise à la page 1 quand un filtre change (test `src/hooks/__tests__/useFiltresUrl.test.ts`)
- [ ] T026 [US4] Appliquer `useFiltresUrl` à `src/app/(admin)/admin/users/page.tsx` (`page`, `search`, `niveau`, `triFiabilite`), puis `reports`, `verifications`, `feedback`, `indices` ; tests de retour arrière (état restauré)
- [ ] T027 [US4] `src/app/(admin)/layout.tsx` : `adminNavItems` en sections, section « Modération » (Indices, Signalements, Vérifications, Retours) avec `NotificationDot`/`CountChip` admin selon l'existant, en desktop et mobile ; test de rendu (4 entrées, ancienne entrée « Profils à vérifier » absente)
- [ ] T028 [US4] Vérifier qu'aucun geste n'a disparu (liste de contrôle dans la PR : trancher, inviter, exiger, bannir, recherche de photo, métadonnées) et capture Playwright de la nav

## Phase 7: User Story 5 — Inscription sans doublon (P2)

**Goal**: double saisie, suggestion de domaine, correction d'adresse avant vérification.
**Independent Test**: quickstart scénario 5.

- [ ] T029 [US5] **Correctif sécurité** dans `src/app/api/auth/verify-email/route.ts` : refuser un jeton dont `normalizeEmail(payload.email)` diffère de `user.normalizedEmail` ; test (lien émis avant correction → `invalid-token`)
- [ ] T030 [P] [US5] Test puis code `suggererDomaine(adresse)` dans `src/lib/email.ts` : liste locale (gmail, hotmail, outlook, live, yahoo, orange, free, sfr, laposte, icloud, wanadoo, gmx, protonmail…), Damerau-Levenshtein ≤ 2 sur le domaine, `null` si exact ou trop loin ; tableau de cas (`gmial.com`, `hotmal.fr`, `orange.fr` exact, `exemple.org` → null)
- [ ] T031 [US5] `src/app/(auth)/register/page.tsx` : second champ « Confirme ton adresse e-mail », envoi bloqué si différent (message en phrase complète), suggestion acceptable d'un geste, annonce de la règle des 30 jours et de sa raison ; adresse passée à l'écran suivant par `sessionStorage` (jamais dans l'URL) ; tests Testing Library
- [ ] T032 [US5] Route `src/app/api/auth/corriger-adresse/route.ts` selon `contracts/api.md` : limiteur `auth`, vérification du mot de passe, réponse uniforme, refus compte vérifié/banni, 409 adresse prise, mise à jour `email` + `normalizedEmail`, envoi d'un nouveau lien ; tests
- [ ] T033 [US5] `src/app/(auth)/login/page.tsx` : avec `?registered=true`, afficher l'adresse lue en `sessionStorage`, la règle des 30 jours et « Corriger mon adresse » ; sur refus de connexion d'un compte non vérifié, proposer le même formulaire ; tests + captures Playwright (390/1280 px, clair/sombre)

## Phase 8: User Story 6 — Durée de vie des comptes et vue des actifs (P3)

**Goal**: 30 j pour un compte jamais vérifié, 1 an + préavis pour un inactif, masquage de Découvrir à 90 j, répartition de présence.
**Independent Test**: quickstart scénarios 6 et 7.

- [ ] T034 [US6] `src/lib/retention/regles.ts` : `depuis` accepte `'dernière présence'` ; règles `comptesNonVerifies` (30 j, création) et `comptesInactifs` (365 j, dernière présence) avec libellés de `data-model.md` ; remplacer le commentaire « pas de règle sur les comptes » par la décision du 2026-10-13
- [ ] T035 [P] [US6] Test puis code des échéances pures dans `src/lib/retention/cycle-de-vie.ts` : `aPreavenir(lastSeenAt, preavisAt, now)`, `aSupprimerInactif(…)`, `aSupprimerNonVerifie(createdAt, emailVerified, now)` ; bornes J-335, J+30 du préavis, retour pendant le préavis
- [ ] T036 [US6] `src/lib/email-send.ts` : `sendPreavisInactiviteEmail(to)` — ce qui va se passer, quand, comment l'éviter (revenir sur Libre), aucun nom ni contenu d'autrui ; copie relue
- [ ] T037 [US6] `src/lib/retention/purge.ts` : exécuteurs `comptesNonVerifies` et `comptesInactifs` (passe préavis puis passe suppression), exclusions (`role !== 'USER'`, banni, selfie `pending`, signalement ouvert), `take: 50`, `effacerCompte` ; échec d'e-mail journalisé sans adresse, préavis daté quand même ; tests dans `src/lib/retention/__tests__/purge.test.ts`
- [ ] T038 [US6] `src/app/api/discover/route.ts` : exclure `lastSeenAt < J-90` de `baseWhere` (les deux chemins) ; test (J-100 absent, revenu → présent)
- [ ] T039 [US6] Bloc `presence` de `GET /api/admin/stats` (tranches < 7 j, < 30 j, < 6 mois, < 1 an, > 1 an, jamais vérifiés, en préavis ; « < 5 ») et son affichage dans `src/components/admin/AnalyticsSection.tsx` avec `DistributionBar`
- [ ] T040 [US6] Annonce de la règle des 30 jours sur le refus de connexion d'un compte non vérifié (si pas déjà fait en T033) et vérifier que `/confidentialite` et `/admin/retention` listent les deux règles (garde promis ⇔ purgé verte)

## Phase 9: Polish & Cross-Cutting

- [ ] T041 [P] Mettre à jour `CLAUDE.md` (section Sécurité / Modération : présence privée, grappes dérivées, correctif `verify-email`, cycle de vie des comptes) et `DESIGN.md` (composants ajoutés)
- [ ] T042 Gates locaux : `npx vitest run`, `npx tsc --noEmit`, `npx eslint`, `npm test` front, E2E des parcours inscription et admin sur l'app servie
- [ ] T043 Après livraison : mesure par agrégat (test jetable, cases < 5) des doublons probables restants et des comptes non vérifiés > 30 j (SC-002, SC-004, SC-006), consignée dans la mémoire projet

## Dependencies & Execution Order

- **Setup (T001–T003)** → **Foundational (T004)** → stories.
- **US1** (T005–T009) : prérequis de **US6** (T037, T038, T039).
- **US2** (T010–T019) : T010 (validation opérateur) bloque T016–T017 ; T014 précède T021.
- **US3** (T020–T024) dépend de US2 (grappes, `gestes.ts`, prototype).
- **US4** : T025–T026 indépendants (peuvent partir tôt) ; T027 dépend de T017–T018.
- **US5** (T029–T033) : indépendante ; T029 peut partir seul en hotfix.
- **US6** dépend de US1 ; T040 dépend de T033.

### Parallel Opportunities

- T003 ∥ T001 ; T005 ∥ T011 ∥ T012 ∥ T025 ∥ T030 (modules purs, fichiers distincts).
- Pendant l'attente de validation du prototype (T010) : US1, US5 et T025–T026.
- T022 ∥ T021 ; T035 ∥ T036.

### Parallel Example: User Story 2

```text
T011 grappes.ts (pur, TDD)   ∥   T012 libellés   ∥   T010 prototype (attente opérateur)
puis T013 → T014 → T015 → T016 → T017 → T018 → T019
```

## Implementation Strategy

- **MVP** : US1 (présence) — petite, ferme #498, débloque US6.
- **Incrément 2** : US2 après validation du prototype — la demande centrale.
- **Incrément 3** : US3 + US4 (souvent dans la même branche tampon : même page, même nav).
- **Incrément 4** : US5 ; T029 (correctif `verify-email`) livrable à tout moment.
- **Incrément 5** : US6 — la suppression des non-vérifiés > 30 j agit dès le premier passage : livrer avec la politique mise à jour, prévenir l'opérateur du nombre attendu (agrégat) avant merge.
