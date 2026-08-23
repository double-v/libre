# Tâches — Messagerie durable

**Spec** : [spec.md](./spec.md) · **Plan** : [plan.md](./plan.md)

Cinq lots, un par user story. Chacun est livrable et démontrable seul. La maille
d'**issue** est le lot, jamais la tâche : une issue = une PR = un checkpoint
opérateur (principe VI).

Tests d'abord, conformément aux gates de la constitution. `[P]` = parallélisable
(fichiers disjoints, aucune dépendance sur une tâche non terminée). `[~]` = fait
partiellement, avec la raison en clair.

**Hors périmètre, déjà livré** : pagination par curseur, déchiffrement paresseux
(#200, PR #254), virtualisation de la liste (PR #303).

---

## Phase 1 — Mise en place (avant tout code)

- [~] T001 **À faire par l'opérateur** — générer la clé maître (32 octets aléatoires, base64) et la déclarer dans les trois environnements Vercel — Production, Preview, Development **séparés** : une clé de preview ne doit jamais ouvrir la production
- [x] T002 [P] Ajouter `CHAT_ESCROW_KEY` à `.env.example` avec un commentaire disant ce que sa perte coûte (tous les messages irrécupérables)
- [x] T003 [P] Écrire la procédure d'exploitation dans `docs/escrow-cle-maitre.md` : génération, stockage, **sauvegarde hors ligne**, rotation via le préfixe `v1:`, conduite à tenir si la clé est absente en développement

---

## Phase 2 — Socle (bloquant pour US1 et US2)

- [x] T004 Écrire d'abord les tests dans `src/lib/__tests__/crypto-escrow.test.ts` : aller-retour enveloppe/désenveloppe, rejet d'un blob altéré (GCM), rejet avec une mauvaise clé maître, présence et lecture du préfixe de version
- [x] T005 Implémenter `src/lib/crypto-escrow.ts` (`import 'server-only'`) : `wrapPrivateKey` / `unwrapPrivateKey` en AES-256-GCM via `node:crypto`, enveloppe préfixée `v1:` — sans version, une rotation future de clé maître n'a aucun moyen de distinguer les formats
- [x] T006 Ajouter `encryptedPrivateKey String?` et `escrowedAt DateTime?` au modèle `UserKey` dans `prisma/schema.prisma`
- [x] T007 Écrire **à la main** la migration `prisma/migrations/<timestamp>_escrow_user_keys/migration.sql` (`ALTER TABLE "user_keys" ADD COLUMN "encryptedPrivateKey" TEXT, ADD COLUMN "escrowedAt" TIMESTAMP(3)`) — colonnes en camelCase entre guillemets, comme les colonnes existantes de cette table. **Jamais `prisma migrate dev`** : la base de développement est partagée
- [x] T008 [P] Test de garde dans `src/lib/__tests__/crypto-escrow-server-only.test.ts` : importer `crypto-escrow` depuis un contexte client doit échouer — la clé maître ne doit jamais atteindre un bundle

---

## Phase 3 — Lot A · US1 · Changer de téléphone sans rien perdre (P1) — le bloquant

**Test d'indépendance** : vider intégralement le stockage local, recharger, et retrouver ses messages. Puis recommencer depuis un second navigateur et avec un compte Google.

- [x] T009 [P] [US1] Tests de la nouvelle route dans `src/app/api/users/keys/me/__tests__/route.test.ts` : 401 sans session, un compte ne reçoit **que** sa propre clé, `Cache-Control: no-store`, cas « publique connue mais coffre vide »
- [x] T010 [P] [US1] Tests de l'extension du POST dans `src/app/api/users/keys/__tests__/route.test.ts` : 400 si la privée ne correspond pas à la publique, 409 si une clé publique **différente** est déjà au coffre, succès nominal
- [x] T011 [P] [US1] Tests du hook dans `src/hooks/__tests__/useEncryptedChat.test.ts` — les quatre branches de l'arbre du plan, dont la plus importante : **publique connue + coffre vide + pas de clé locale correspondante → aucune régénération** (FR-005)
- [x] T012 [US1] Implémenter `GET /api/users/keys/me` dans `src/app/api/users/keys/me/route.ts` : session obligatoire, rate limit comme les autres routes authentifiées, désenveloppe côté serveur, `no-store`
- [x] T013 [US1] Étendre `POST /api/users/keys` dans `src/app/api/users/keys/route.ts` : accepte `privateKey`, **vérifie qu'elle correspond à la publique** avant d'envelopper — sans ce contrôle, un client fautif empoisonne le coffre de façon irréversible
- [x] T014 [US1] Refondre `src/hooks/useEncryptedChat.ts` selon l'arbre de décision du plan : clé privée en mémoire de session, plus aucune écriture disque, jamais de régénération quand une clé publique est connue
- [x] T015 [US1] Proposer dans `DESIGN.md` l'état visuel « message illisible » **avant** de l'implémenter (principe IV) — réutiliser le registre de la pierre tombale existante plutôt qu'inventer une surface
- [x] T016 [US1] Supprimer le repli silencieux de `tryDecrypt` dans `src/app/(main)/chat/[conversationId]/page.tsx` : un échec marque le message comme illisible au lieu de renvoyer le ciphertext tel quel
- [x] T017 [US1] Afficher cet état dans `src/components/chat/ChatMessageList.tsx`, avec ce que la personne peut faire (revenir sur son appareil d'origine)
- [x] T018 [US1] Purger la clé **et le cache de messages en clair** à la déconnexion (`loadPlaintextCache` écrit aujourd'hui les messages déchiffrés dans le stockage local : retirer la serrure en laissant la porte ouverte ne vaut rien)
- [x] T019 [US1] Scénario écrit dans `tests/e2e/escrow-second-appareil.spec.ts` et **exécuté pour de vrai** le 2026-08-17 (base locale + app servie + Playwright) : message relu en clair après purge intégrale du stockage. Reste `skip` dans la suite partagée, qui n'a pas encore ses fixtures (#164)
- [x] T020 [US1] Gate visuel (principe V) : prototype rendu sur l'app servie (`next dev`), capturé en clair **et** sombre, mesuré en plusieurs points — bulle « illisible » du bon côté, aucun chiffré brut à l'écran, registre identique à la pierre tombale

---

## Phase 4 — Lot B · US2 · Les comptes déjà là ne perdent rien (P2)

**Test d'indépendance** : depuis un navigateur portant une clé locale d'avant la mise en service, ouvrir l'app, puis se connecter ailleurs — les fils d'avant s'ouvrent.

- [ ] T021 [P] [US2] Test dans `src/hooks/__tests__/useEncryptedChat.test.ts` : clé locale correspondant à la publique connue → versement au coffre, puis non rejoué au rechargement suivant
- [ ] T022 [US2] Implémenter le versement dans `src/hooks/useEncryptedChat.ts` : sans écran, sans question, et seulement après un `200` confirmé avant de considérer la clé locale comme périmée
- [ ] T023 [US2] Journaliser l'issue de la migration **sans PII** via `src/lib/logger.ts` (versée / impossible / échec réseau) — sans trace, on ignorera combien de comptes sont restés au bord du chemin, exactement comme la panne de reset restée invisible des mois (#334)
- [ ] T024 [US2] Relever ces compteurs après mise en service et consigner le résultat dans l'issue avant de la fermer

---

## Phase 5 — Lot C · US3 · Savoir ce que le service peut lire (P2)

**Test d'indépendance** : lire la page Confidentialité et confronter chaque phrase au comportement réel.

- [x] T025 [P] [US3] Test de non-régression dans `src/app/(legal)/__tests__/confidentialite.test.tsx` : la page contient la formulation honnête **et ne contient plus** de promesse du type « personne d'autre ne peut les lire » (FR-011)
- [x] T026 [US3] Réécrire la section messagerie de `src/app/(legal)/confidentialite/page.tsx` : chiffré en transit et au repos, le service peut techniquement lire, pourquoi ce choix, ce qui est conservé et jusqu'à quand (la vie du match)
- [x] T027 [P] [US3] Mentionner le cache de messages en clair sur l'appareil — l'omettre reproduirait la promesse non adossée corrigée en #328
- [x] T028 [P] [US3] Réconcilier `src/app/(legal)/cgu/page.tsx` et la FAQ sur la même posture, et vérifier qu'aucun autre écran ne promet davantage

---

## Phase 6 — Lot D · US4 · Un vieux fil reste lisible après rotation (P3, #199)

**Test d'indépendance** : provoquer une rotation, rouvrir une conversation antérieure — elle est lisible des deux côtés.

- [ ] T029 [P] [US4] Tests dans `src/lib/__tests__/key-rotation.test.ts` : une génération retirée reste déchiffrable, une clé de conversation ré-enveloppée donne le même clair
- [ ] T030 [US4] Modèles `UserKeyHistory` et `ConversationKey` dans `prisma/schema.prisma` + colonne `Message.encScheme Int @default(1)`
- [ ] T031 [US4] Migration additive écrite à la main dans `prisma/migrations/<timestamp>_historique_cles/migration.sql` — défaut `1` sur les messages existants, aucune ligne réécrite
- [ ] T032 [US4] Rotation dans `src/lib/crypto-escrow.ts` et `src/app/api/users/keys/route.ts` : archiver la génération courante au lieu de l'écraser, ré-envelopper les clés de conversation, **ne ré-chiffrer aucun message**
- [ ] T033 [US4] Lecture selon `encScheme` dans `src/lib/chat-messages.ts` : `1` par la génération d'époque, `2` par la clé de conversation
- [ ] T034 [US4] Test Playwright dans `tests/e2e/rotation-cle.spec.ts` : rotation puis lecture d'un fil antérieur

---

## Phase 7 — Lot E · US5 · Effacer pour de bon (P3, #202)

**Test d'indépendance** : effacer un message et vérifier la pierre tombale des deux côtés ; rompre un match de test et vérifier qu'aucun chemin ne restitue le fil.

- [ ] T035 [US5] Trancher avec l'opérateur la **fenêtre de conservation pour la modération** : le ciphertext est aujourd'hui gardé exprès (#201), et l'escrow le rend lisible par le service. Décision produit, préalable au code
- [ ] T036 [P] [US5] Tests dans `src/app/api/chat/[conversationId]/messages/[id]/__tests__/route.test.ts` : après effacement, aucune réponse d'API ne contient le contenu
- [ ] T037 [US5] Appliquer la décision de T035 dans `src/app/api/chat/[conversationId]/messages/[id]/route.ts`
- [ ] T038 [P] [US5] Test de cascade dans `src/__tests__/purge-cascade.test.ts` : rupture de match et suppression de compte détruisent conversation, messages, clés de conversation **et** coffre — l'attester par un test, pas par lecture du schéma
- [ ] T039 [US5] Purge périodique via un cron déclaré dans `vercel.json` (deux crons existent déjà, le patron est en place)

---

## Polish et transverse

- [ ] T040 [P] Vérifier que `DESIGN.md` décrit l'état final (état « illisible » adopté, pas seulement proposé)
- [ ] T041 [P] Mettre à jour `CLAUDE.md` § Sécurité : l'affirmation « chiffrement E2E des messages » doit refléter la posture réelle après escrow
- [ ] T042 REX dans le vault une fois le lot A en production : ce qu'a donné la migration douce, combien de comptes sont restés illisibles

---

## Dépendances

```
Phase 1 (mise en place)
   └── Phase 2 (socle : crypto-escrow + migration)
          └── Lot A (US1) ──► Lot B (US2) ──► Lot C (US3)
                                                  │
                              Lot D (US4) ◄───────┘
                              Lot E (US5)
```

- **Lot A est le MVP.** Livré seul, il supprime la perte de données ; tout le
  reste est du confort ou de la dette réduite.
- **Lot C ne peut pas traîner** : livrer A sans C laisse une page Confidentialité
  qui ment, ce que la constitution interdit (principe III, corollaire #328).
- **Lot D et Lot E** n'ont aucune urgence tant que A tient.

## Parallélisation

- Phase 1 : T002 et T003 ensemble, après T001.
- Phase 2 : T008 en parallèle de T006/T007 (fichiers disjoints).
- Lot A : T009, T010, T011 ensemble (trois fichiers de tests distincts) ; T015
  peut démarrer avant que les routes soient écrites.
- Lot C : T025, T027, T028 ensemble.

## Correspondance avec le backlog

| Lot | User story | Issue |
|---|---|---|
| A | US1 — changer d'appareil | #198 (recadré sur ce seul récit le 2026-08-17) — PR #338 |
| B | US2 — migration douce | #336 |
| C | US3 — transparence | #337 — livré dans la **même PR** que le lot A : déployer l'escrow sans la copie honnête laisserait une promesse fausse en production entre deux mises en ligne (précédent : PR #333, trois récits en une PR) |
| D | US4 — historique de clés | #199 (débloqué par A) |
| E | US5 — purge réelle | #202 (recadré : l'éphémère sort du périmètre) |
