# Tasks: Détection des faux profils

**Input**: Design documents from `/specs/006-faux-profils/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Issues** (ouvertes le 2026-09-24) : US1 #442 · US2 #443 (+ phase 2) · US4 #444 · US3 #445 · US5 #446 · hors spec, lié : #441 (EXIF).

**Tests**: TDD — le dépôt l'impose (ghwork, constitution « promesse adossée à un test par route »). Chaque tâche de code a son test écrit **avant**, dans le même fichier de tâche ou juste au-dessus.

**Organisation** : une phase par user story = une issue = une PR. La phase 2 (fondations) est livrée **avec l'issue US2**, première à en avoir besoin ; US1 n'en dépend pas.

## Format: `[ID] [P?] [Story] Description`

- **[P]** : parallélisable (fichiers différents, sans dépendance en attente)
- **[Story]** : US1…US5 de spec.md

---

## Phase 1: Setup

- [x] T001 Pour chaque issue, créer le worktree `/home/w/projects/.worktrees/getlibre/<branche>/` depuis `libre/main` ; `.env` copié, `node_modules` en liens durs (`cp -al`), `npx prisma generate`, `npx vitest run` vert au départ
- [x] T002 Ouvrir une issue GitHub par user story sur `double-v/libre` (US1, US2, US4, US3, US5), corps = la story de spec.md + lien vers `specs/006-faux-profils/` ; noter les numéros en tête de ce fichier

---

## Phase 2: Foundational (livrée avec US2)

- [x] T003 Ajouter à `package.json` les dépendances `tesseract.js@7.0.0` et `@tesseract.js-data/eng@1.0.0`, et greffer au `package-lock.json` avec `jq` les entrées exactes produites dans un bac à sable npm (liste en research.md R5) — **ne jamais lancer `npm install` dans le dépôt** ; vérifier `npm ci --dry-run` sans `EUSAGE` et que `git diff package-lock.json` ne supprime aucune ligne `libc`
- [x] T004 Ajouter les modèles `ProfileSignal` (`profile_signals`) et le champ `User.retraitAt` dans `prisma/schema.prisma` selon data-model.md ; écrire à la main `prisma/migrations/20260925100000_profile_signals/migration.sql` (table, index unique `(userId, cle)`, FK cascade, colonne nullable) ; `npx prisma generate` — jamais `migrate dev`
- [x] T005 [P] Test puis module pur `src/lib/fraude/signaux.ts` : `enregistrerSignal({ userId, type, force, extrait?, photoKey?, autreUserId? })` (upsert sur `cle` = type + contenu normalisé, `extrait` tronqué à 200) et `dansLaFile(signaux, decidedAt)` (règle de data-model.md : un fort, ou deux, ou un `signalement_faux`, postérieurs à la décision ; `photo_recuperee` seul ne compte pas) — tests dans `src/lib/fraude/__tests__/signaux.test.ts`
- [x] T006 [P] Test de non-fuite `src/__tests__/signaux-never-leak.test.ts` (patron `city-label-never-leaks.test.ts`) : aucune route lue par un autre membre ne sélectionne `retraitAt` ni `profileSignals` ; le membre lui-même ne reçoit que `retrait: boolean`

**Checkpoint** : signaux enregistrables et règle d'entrée en file testée.

---

## Phase 3: User Story 1 - Vérifier une photo en un clic (P1) 🎯 MVP

**Goal**: depuis la fiche d'un membre, lancer Lens / Yandex / TinEye sur une photo, journalisé.
**Independent Test**: sur une fiche avec photos, cliquer « Google Lens » ouvre la recherche de cette photo ; `/admin/logs` montre `SEARCH_PHOTO`.

- [x] T007 [P] [US1] Tests puis route `src/app/api/admin/photos/recherche/route.ts` (contrat api.md) : 401/403 non-admin ; 400 moteur inconnu ; 404 clé absente de `profile.photos` ; 302 vers `lens.google.com/uploadbyurl?url=`, `yandex.com/images/search?rpt=imageview&url=`, `tineye.com/search?url=` avec `getPhotoSignedUrl(clé originale)` encodée ; `moderationLog` `SEARCH_PHOTO` (reason = `moteur:clé`) — tests dans `src/app/api/admin/photos/recherche/__tests__/route.test.ts`
- [x] T008 [US1] Prototype HTML du bouton « Rechercher cette image » (menu 3 moteurs) sur une vignette de la fiche admin, clair/sombre ; **validation opérateur avant T009**
- [x] T009 [US1] Composant `src/components/AdminPhotoSearch.tsx` (liens `target="_blank" rel="noopener noreferrer"` vers la route T007, 3 moteurs, cible ≥ 44 px) + test `src/components/__tests__/AdminPhotoSearch.test.tsx` ; l'intégrer sous chaque photo de `src/app/(admin)/admin/users/[id]/page.tsx` et de `src/components/AdminVerificationCard.tsx`
- [x] T010 [US1] Libellé `SEARCH_PHOTO` dans la page `/admin/logs` s'il y a une table de libellés ; capture Playwright clair/sombre de la fiche membre

**Checkpoint** : US1 livrable seule — sert immédiatement sur chaque signalement « Faux profil ».

---

## Phase 4: User Story 2 - Repérer le contact externe (P1)

**Goal**: contact externe refusé à l'écriture du pseudo et de la bio, et lu sur les photos → signaux.
**Independent Test**: bio « écris-moi sur t.me/xyz » → 400 avec la règle + signal ; photo « Telegram : @lola_privee75 » → signal `contact_photo`.

- [x] T011 [P] [US2] Test en tableau puis `src/lib/fraude/contact.ts` : `detecterContact(texte) → Array<{ type, extrait, force }>` selon research.md R3 — cas obligatoires : `@lola_privee75`, `t.me/xyz`, `t . m e / x y z`, `snap: lolaa.vip`, `telegram lola75`, `wa.me/33612345678`, `06 12 34 56 78`, `061234 56 78` (sortie OCR réelle), `+33 6 12 34 56 78`, `onlyfans.com/x` → fort ; `je n'ai pas Telegram`, `a@b.fr` → faible ; `@ bientôt`, `Paris 2024`, `j'aime le 06` → rien
- [x] T012 [US2] Tests puis refus à l'écriture : `src/app/api/users/profile/route.ts` (bio) et la mise à jour du pseudo (`src/app/api/users/me/route.ts`, inscription `src/app/api/auth/register/route.ts`) → contact **fort** : 400 `{ error: 'Les contacts se partagent dans la messagerie, une fois le match fait.', extrait }` + `enregistrerSignal(contact_bio|contact_pseudo, fort)` ; **faible** : enregistré + signal faible
- [ ] T013 [US2] Afficher l'`extrait` sous le champ en erreur dans les formulaires existants (profil, `/bienvenue`, inscription) — copie seulement, composants existants ; capture Playwright
- [x] T014 [P] [US2] Test puis `src/lib/fraude/lecture-photo.ts` : worker `tesseract.js` unique et paresseux (`langPath` vers `@tesseract.js-data/eng`, aucun réseau), `lireTexte(buffer) → string`, délai max 15 s puis abandon journalisé sans PII ; test avec l'image générée de research.md R1 (`sharp` + SVG) ; ajouter les fichiers du modèle à `outputFileTracingIncludes` de `next.config.ts` pour la route photos
- [x] T015 [US2] Tests puis `src/lib/fraude/analyse.ts` `analyserPhoto({ userId, photoKey, buffer })` : `lireTexte` → `detecterContact` → signal `contact_photo` (fort si motif fort) ; best-effort, ne jette jamais ; appelé dans `after()` de `POST src/app/api/users/photos/route.ts` avec le tampon déjà en mémoire — la réponse ne change pas (test)
- [x] T016 [US2] Signalement « Faux profil » : dans `src/app/api/moderation/report/route.ts`, motif `fake` → `enregistrerSignal(signalement_faux, fort, cle = reportId)` ; test

**Checkpoint** : rejoué sur le cas du 2026-09-24, le compte porte un signal fort (SC-001, sans la file).

---

## Phase 5: User Story 4 - Trancher un profil à vérifier (P2)

**Goal**: file admin, trois décisions, mise en retrait, compteur, rattrapage.
**Independent Test**: un profil avec un signal fort apparaît ; « Rien à signaler » le retire ; « Demander une vérification » le retire de Découvrir ; approuver son badge l'y remet.

- [x] T017 [US4] Migration `ProfileReview` (`profile_reviews`) selon data-model.md (`prisma/migrations/20260926100000_profile_reviews/migration.sql`)
- [x] T018 [P] [US4] Test puis `src/lib/fraude/visibilite.ts` `visiblePourAutrui = { isBanned: false, retraitAt: null }` ; l'appliquer à toutes les requêtes qui listent des profils à d'autres membres (`src/app/api/discover`, `geoloc/nearby`, `geoloc/crossings`, `users/[id]` → 404, `circle/contacts`, et toute autre trouvée par `grep isBanned`) ; garde `src/__tests__/visibilite-gardes.test.ts` (patron `features-gardes.test.ts`) qui échoue si une route listant des profils n'utilise pas le fragment
- [x] T019 [US4] Tests puis refus 403 `verification_requise` pour un membre en retrait : envoi de message (`src/app/api/chat/[conversationId]/messages/route.ts`) et like (`src/app/api/likes/route.ts`)
- [x] T020 [US4] Tests puis routes `src/app/api/admin/profils-a-verifier/route.ts` (liste, ordre de data-model.md, e-mail masqué, photos via `photoUrl`) et `…/[userId]/route.ts` (décisions ; `verification` → `retraitAt = now()` ; `banni` → chemin de bannissement existant ; journal `PROFILE_REVIEW_*`)
- [x] T021 [US4] Badge approuvé → `retraitAt = null` dans `src/app/api/admin/verifications/[id]/route.ts` ; test
- [x] T022 [US4] Compteur : `profils` dans `src/lib/admin-queues.ts`, `GET /api/admin/queues`, `useAdminQueues`, entrée « Profils à vérifier » dans `adminNavItems` de `src/app/(admin)/layout.tsx`
- [x] T023 [US4] Prototype HTML de `/admin/profils` et de l'invitation membre en retrait, clair/sombre ; **validation opérateur avant T024**
- [x] T024 [US4] Page `src/app/(admin)/admin/profils/page.tsx` + carte (réutilise `AdminPhotoSearch`, `Tag`, `Button`, `Card`) ; composant `src/components/RetraitNotice.tsx` (lien `/verify`, aucune mention de soupçon) affiché dans le layout `(main)` quand `retrait: true` ; `GET /api/users/profile` renvoie `retrait` au seul intéressé ; tests composants
- [x] T025 [US4] Rattrapage FR-011 : `POST src/app/api/admin/profils-a-verifier/analyse/route.ts` (lot de 10 profils non analysés : bio/pseudo + photos relues depuis R2) + bouton sur la page ; test
- [x] T026 [US4] Rétention : règle `signauxTranches` (1 an après décision « rien ») dans `src/lib/retention/regles.ts` + `purge.ts` + tests ; §5 se met à jour seul
- [x] T027 [US4] Politique `src/app/(legal)/confidentialite/page.tsx` : finalité « lutte contre la fraude et les faux profils » (intérêt légitime), données traitées (texte du profil et des photos, empreintes), aucune décision automatique ; test de présence

**Checkpoint** : la file transforme les signaux en décisions humaines journalisées.

---

## Phase 6: User Story 3 - La même photo sur plusieurs comptes (P2)

**Goal**: empreinte à l'ajout, comparaison aux autres comptes et aux bannis, rétention 1 an.
**Independent Test**: bannir un compte, ajouter sa photo recompressée et recadrée de 10 % à un autre → signal `photo_bannie`.

- [ ] T028 [US3] Migration `photo_fingerprints` et `banned_photo_fingerprints` selon data-model.md
- [ ] T029 [P] [US3] Test puis `src/lib/fraude/empreinte.ts` : `empreinte(buffer) → bigint` (dHash 9×8 via `sharp`), `distance(a, b)`, `SEUIL = 8` ; tests : recompression, recadrage 5 % et 10 % ≤ 8, image différente > 8 (images générées, research.md R2)
- [ ] T030 [US3] `analyserPhoto` : enregistrer l'empreinte, comparer aux empreintes des **autres** comptes (signal `photo_reutilisee` fort sur les deux comptes, `autreUserId` croisé) et aux bannies (`photo_bannie` fort) ; suppression d'une photo → suppression de son empreinte (`DELETE src/app/api/users/photos/route.ts`) ; tests
- [ ] T031 [US3] Décision `banni` (T020) → copie des empreintes du compte dans `banned_photo_fingerprints` ; règle de rétention `empreintesBannies` (1 an) dans `regles.ts` + `purge.ts` ; tests
- [ ] T032 [US3] Rattrapage (T025) : calculer aussi les empreintes des photos existantes

**Checkpoint** : bannir sert au-delà d'une fois.

---

## Phase 7: User Story 5 - Indice faible : la photo « récupérée » (P3)

- [ ] T033 [P] [US5] Test puis `src/lib/fraude/forme-photo.ts` : `formeRecuperee(metadata)` — dimensions de la liste de research.md R4 **et** aucun EXIF ; lu sur le tampon reçu, avant tout nettoyage (#441)
- [ ] T034 [US5] `analyserPhoto` : signal `photo_recuperee` faible ; test qu'il ne fait jamais entrer seul un profil en file ; affiché « indice faible » dans la carte de la file

---

## Phase 8: Polish & Cross-Cutting

- [ ] T035 Rejouer quickstart.md (scénarios 1 à 6) sur base locale jetable, R2 désactivé ; captures clair/sombre jointes à chaque PR front
- [ ] T036 [P] Mettre à jour `CLAUDE.md` (section courte « Détection des faux profils ») : signaux privés, jamais de sanction automatique, `visiblePourAutrui` obligatoire pour toute nouvelle route listant des profils
- [ ] T037 Relecture de SC-004 à J+30 (taux de « Rien à signaler » sur signal fort) — note dans l'issue US4

---

## Dependencies & Execution Order

- **US1** : aucune dépendance → livrable immédiatement.
- **Phase 2** : livrée dans la PR de **US2**.
- **US4** dépend de US2 (signaux) ; **US3** dépend de US4 (bannissement depuis la file, rattrapage) ; **US5** dépend de US2.
- Ordre : US1 → US2 (+ phase 2) → US4 → US3 → US5 → Polish.

### Parallel Opportunities

- US1 et US2 en parallèle (fichiers disjoints) si deux sessions ; sinon séquentiel (concurrence ghwork = 1).
- Dans US2 : T011 et T014 (modules purs) en parallèle.
- Dans US4 : T018 et T020 en parallèle après T017.

## Implementation Strategy

- **MVP** : US1 seule — utile dès demain pour chaque signalement.
- **Incrément 2** : US2 — le signal du cas réel (contact sur la photo) devient automatique.
- **Incrément 3** : US4 — la file et la mise en retrait donnent des décisions.
- Puis US3, US5. Chaque incrément = une PR, mergée par l'opérateur.
