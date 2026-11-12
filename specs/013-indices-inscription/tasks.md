# Tasks: Indices réseau et image à l'inscription

**Input**: documents de `specs/013-indices-inscription/` (spec, plan,
research, data-model, contracts/indices.md, securite.md, quickstart)

**Tests** : **obligatoires**, par doctrine du dépôt (plan.md, « Doctrine de
test »). Chaque test s'écrit avant son code, son **rouge est prouvé** et
consigné dans la PR, et il observe des effets (lignes en base factice qui
honore `where`, `select` et l'unicité ; réponses), jamais un simple appel de
mock.

**Lots proposés** : lot 1 = US1 + US2 (connexion), lot 2 = US3 + US4 (image
et lecture). Un lot = une PR = un déploiement. La PR s'ouvre en brouillon et
l'opérateur merge.

## Format : `[ID] [P?] [Story] Description`

- **[P]** : parallélisable (fichiers différents, sans dépendance en cours)
- **[Story]** : US1 à US4 (spec.md)

---

## Phase 1 : Mise en place

- [ ] T001 Worktree `feat/<issues>-indices-013` sous `/home/w/projects/.worktrees/getlibre/`, `node_modules` par `cp -al`, `npx prisma generate`, e-mail git noreply ; **pas de `.env`**
- [ ] T002 Relire `specs/013-indices-inscription/securite.md` et lister dans le brouillon de PR les menaces que le lot touche (M1–M12), chacune avec le nom du test hostile à écrire

---

## Phase 2 : Fondations (bloquent les quatre stories)

- [ ] T003 Migration additive écrite à la main, `prisma/migrations/2026111x_indices_connexion/migration.sql` : `users.pays_connexion_vus TEXT[] NOT NULL DEFAULT '{}'`, `profiles.pays_ville CHAR(2)` ; schéma `prisma/schema.prisma` (`paysConnexionVus`, `paysVille` avec `@map`), commentaire `///` du champ `ProfileSignal.type` complété des 4 types. **Ne jamais modifier une migration déjà poussée**
- [ ] T004 [P] Ajouter les types `pays_connexion`, `reseau_masque`, `photo_ia_generee`, `photo_ia_retouchee` à `TypeSignal` dans `src/lib/fraude/signaux.ts`, et `pays_connexion`, `reseau_masque`, `photo_ia_retouchee` à `TYPES_CONTEXTE` dans `src/lib/fraude/fiabilite.ts` ; tests dans `src/lib/fraude/__tests__/fiabilite.test.ts` : un `photo_ia_generee` seul donne « douteux » ; deux indices de contexte n'entrent pas dans la file (`dansLaFile`) ; `pays_connexion` + `reseau_masque` + `fuseau_incoherent` donnent « douteux »
- [ ] T005 [P] Garde de non-fuite : ajouter `paysConnexionVus` et `paysVille` aux champs privés de `src/__tests__/city-label-never-leaks.test.ts` (rouge prouvé en exposant volontairement un champ dans une route, puis retour)

**Checkpoint** : migration appliquée sur la base jetable de `npm run test:db`, types en place.

---

## Phase 3 : User Story 1 — Pays de connexion ≠ pays de la ville (P1) 🎯 MVP

**But** : un compte qui déclare une ville en France et se connecte depuis un autre pays porte l'indice faible `pays_connexion` avec le code du pays.

**Test indépendant** : inscription factice avec `x-vercel-ip-country: CI` et une ville à Lyon, qui lève l'indice ; même pays ou outre-mer, aucun indice.

### Tests US1 (rouges d'abord)

- [ ] T006 [P] [US1] `src/lib/connexion/__tests__/territoires.test.ts` : chaque territoire de R4 (métropole, Corse, Guadeloupe, Martinique, Guyane, La Réunion, Mayotte, Saint-Pierre-et-Miquelon, Saint-Barthélemy, Saint-Martin, Wallis-et-Futuna, Polynésie, Nouvelle-Calédonie, TAAF) : un point connu à l'intérieur donne `FR` ; Bruxelles, Genève, Abidjan, Dakar et Casablanca ne donnent pas `FR`
- [ ] T007 [P] [US1] `src/lib/connexion/__tests__/pays.test.ts` : `paysConnexion` (M2 : `XX`, `T1`, `fr`, `FRA`, tableau, `x-country`, `cf-ipcountry` donnent `null` ; `RE` donne `FR`) ; `paysVille` (M1 : coordonnées de Lyon avec `country: "Côte d'Ivoire"` donnent `FR` ; Abidjan avec « Côte d’Ivoire » (apostrophe typographique) donne `CI` ; nom inconnu hors de France donne `null`) ; `paysDifferent` avec `null` donne `false`
- [ ] T008 [P] [US1] `src/lib/connexion/__tests__/indices-pays.test.ts`, base factice qui honore l'unicité `(userId, cle)` : inscription `CI` avec ville FR donne un signal `pays_connexion`, `extrait = 'CI'`, clé `pays:CI` ; trois connexions `CI` donnent un seul signal ; puis `SN` donne un second signal (scénario 2) ; sans ville, `pays_connexion_vus = ['CI']` et aucun signal, puis la ville saisie lève l'indice (scénario 3, FR-004) ; changement de ville vers Abidjan : pas de nouveau signal `CI`, l'ancien reste (FR-005) ; un 9ᵉ pays n'est pas ajouté
- [ ] T009 [P] [US1] M6 dans le même fichier : base factice qui lève une erreur dont le message contient l'adresse ; `observerConnexion` ne lève pas, et `console.*` capturé ne contient ni l'adresse, ni le code pays, ni l'identifiant
- [ ] T010 [P] [US1] `src/app/api/auth/__tests__/register-indices.test.ts` et test de `authorize` (`src/lib/__tests__/auth-indices.test.ts`) : réponse inchangée (statut et clés) avec un pays étranger ; M4 : `authorize` en échec (mauvais mot de passe, e-mail non confirmé, banni) n'écrit **rien** ; succès : l'effet est planifié dans `after()`
- [ ] T011 [US1] `tests/integration/indices-013.test.ts` (vrai PostgreSQL) : remplissage SQL de `pays_ville` égal à `territoires.ts` sur les centres et coins intérieurs de chaque boîte ; course avec barrière : 2 connexions `CI` simultanées donnent 1 signal ; 9 pays en parallèle donnent 8 codes au plus, sans doublon

### Implémentation US1

- [ ] T012 [P] [US1] `src/lib/connexion/territoires.ts` : boîtes `{ sud, nord, ouest, est }` des territoires de R4 et ensemble des codes ISO ramenés à `FR` ; boîtes généreuses, commentées par territoire
- [ ] T013 [US1] `src/lib/connexion/pays.ts` : `paysConnexion`, `paysVille` (table inverse nom → code construite une fois depuis `Intl.DisplayNames('fr', { type: 'region' })`, normalisation NFD, apostrophes, casse), `paysDifferent` (contrat dans `contracts/indices.md`)
- [ ] T014 [US1] Remplissage SQL dans la migration de T003 avec les **mêmes** boîtes que `territoires.ts` (copiées par un petit script de génération, ou écrites à la main et vérifiées par T011)
- [ ] T015 [US1] `src/lib/connexion/indices.ts` : `observerConnexion` (pays seulement à ce stade) ; ajout de pays en **une** requête `$executeRaw` conditionnelle (`array_append` si absent et si `cardinality < 8`) ; `reevaluerPays(userId)` ; signaux via `enregistrerSignal` (clé `pays:<CC>`, `extrait` = code) ; `try/catch` global, journal `{ evt: 'connexion.indices.echec', err: err.name }` seulement
- [ ] T016 [US1] Brancher `after(() => observerConnexion(…))` dans `src/app/api/auth/register/route.ts` (à côté d'`analyserInscription`) et dans `authorize(credentials, req)` de `src/lib/auth.ts`, **après** toutes les vérifications réussies, avec `req.headers` et `getClientIp`
- [ ] T017 [US1] Écrire `paysVille` dans `src/app/api/users/profile/route.ts` (même écriture que la position de `city`, `null` si `city` vaut `null`) et dans `src/app/api/geoloc/update/route.ts` ; puis `after(() => reevaluerPays(userId))`
- [ ] T018 [P] [US1] Libellés : `LIBELLES_SIGNAL.pays_connexion` = « Connexion depuis un autre pays que celui de sa ville » et `MENTION_LEGITIME.pays_connexion` = « Peut être légitime : voyage, expatriation ou vie près d'une frontière. » dans `src/lib/fraude/libelles.ts`
- [ ] T019 [US1] Politique de confidentialité (page `confidentialite`) : pays de connexion, ce qui est conservé (un code pays, jamais l'adresse), base légale (intérêt légitime, sécurité des membres) — FR-019
- [ ] T020 [US1] Mutations à la main (`scratchpad/mutant.sh`) : retirer le ramenage de l'outre-mer, inverser l'ordre coordonnées / nom dans `paysVille`, retirer la validation `/^[A-Z]{2}$/`, retirer `cardinality < 8`, journaliser `err` au lieu de `err.name` ; chaque mutant doit être tué, sinon on corrige le test ou on le justifie comme équivalent dans la PR

**Checkpoint** : US1 testable seule.

---

## Phase 4 : User Story 2 — Réseau d'hébergement ou VPN (P1)

**But** : une connexion depuis une plage d'hébergeur ou de VPN lève `reseau_masque` avec la seule catégorie ; jamais pour le relais Apple, une adresse inconnue ou de l'IPv6.

**Test indépendant** : adresses témoins (hébergeur, VPN, relais Apple, FAI résidentiel) ; seules les deux premières lèvent l'indice.

### Tests US2 (rouges d'abord)

- [ ] T021 [P] [US2] `scripts/reseaux/__tests__/generer-table.test.ts` : sur des sources factices, fusion et disjonction des plages, priorité `relais` > `vpn` > `hebergement` sur un recouvrement partiel, rejet d'une ligne qui n'est pas un CIDR IPv4 strict, échec au-delà du budget de taille (M10), empreintes SHA-256 et nombre de lignes reportés
- [ ] T022 [P] [US2] `src/lib/connexion/__tests__/reseau.test.ts` : invariants du module **généré** (débuts strictement croissants, fin ≥ début et < début suivant, catégories de 1 à 3, longueurs égales) ; bornes exactes d'une plage (premier et dernier octet dedans, voisins dehors) ; `::ffff:a.b.c.d` ramené à l'IPv4 ; IPv6, `unknown`, `1.2.3`, `01.2.3.4` et `256.1.1.1` donnent `null` ; témoins M9 : résolveurs publics d'au moins deux FAI français donnent `null`, un témoin d'hébergeur donne `hebergement`, un témoin du relais Apple donne `relais`
- [ ] T023 [P] [US2] Ajouter à `src/lib/connexion/__tests__/indices-reseau.test.ts` : hébergeur donne un signal `reseau_masque` avec `extrait = 'hebergement'` et clé `reseau:hebergement` ; VPN donne la clé `reseau:vpn` ; relais et `null` n'écrivent rien (FR-008) ; aucune ligne écrite ne contient l'adresse (on parcourt toutes les colonnes de la base factice)

### Implémentation US2

- [ ] T024 [US2] `scripts/reseaux/generer-table.mjs` : lit un dossier de sources téléchargées (`datacenter-ipv4.txt` et `vpn-ipv4.txt` d'X4BNet, `egress-ip-ranges.csv` d'Apple), garde du relais Apple les seules plages IPv4 qui recoupent les deux autres, fusionne et rend les plages disjointes avec la priorité, encode en base64, écrit `src/lib/connexion/table-reseaux.generated.ts` avec `GENEREE_LE` et `SOURCES` ; échoue au-delà de 1 Mo
- [ ] T025 [US2] Télécharger les sources (données publiques, aucune donnée de membre), **vérifier la licence MIT dans le fichier `LICENSE` d'X4BNet** et les conditions de la liste d'Apple, générer la table, consigner dans la PR le poids, le nombre de plages par catégorie et les licences ; ajouter une mention d'attribution dans `THIRD_PARTY_NOTICES.md` (à créer s'il n'existe pas)
- [ ] T026 [US2] `src/lib/connexion/reseau.ts` : décodage paresseux une fois par instance, parseur IPv4 strict, recherche dichotomique, `TABLE_RESEAUX_DATE`
- [ ] T027 [US2] Compléter `observerConnexion` dans `src/lib/connexion/indices.ts` : catégorie `hebergement` ou `vpn` donne le signal `reseau_masque`
- [ ] T028 [P] [US2] Libellés : `reseau_masque` = « Connexion par un réseau d'hébergement ou un VPN » ; mention : « Peut être légitime : réseau d'entreprise ou d'école, VPN de protection, Cloudflare WARP. » dans `src/lib/fraude/libelles.ts`
- [ ] T029 [US2] Politique de confidentialité : nature du réseau, aucune adresse conservée, aucune requête vers un service extérieur
- [ ] T030 [US2] Mesure SC-003 et M10 : `next build` sur la base jetable, poids de la fonction de `[...nextauth]` et de `register` avant et après, temps de `categorieReseau` (1 000 appels) consigné dans la PR
- [ ] T031 [US2] Mutations : retirer la priorité `relais`, décaler une borne de la recherche (`<` vers `<=`), accepter l'IPv6 comme IPv4, retirer le rejet des CIDR non stricts du générateur
- [ ] T032 [US2] Au déploiement de prévisualisation du lot 1 : contrôle R1 et M2 (`quickstart.md` §3, point de diagnostic temporaire réservé à l'admin, retiré avant `ready`), résultat consigné dans la PR

**Checkpoint** : lot 1 complet (US1 + US2), PR prête après les gates.

---

## Phase 5 : User Story 3 — Photo déclarée générée par IA (P1)

**But** : avant le retrait des métadonnées, la déclaration d'IA de toute photo (profil et selfie) donne `photo_ia_generee` (fort) ou `photo_ia_retouchee` (faible) ; la photo est acceptée normalement.

**Test indépendant** : images forgées (générée, retouchée, appareil, sans rien, piégées) ; indices attendus, photo stockée sans métadonnées.

### Tests US3 (rouges d'abord)

- [ ] T033 [P] [US3] Fabriques de fichiers dans `src/lib/__tests__/fixtures/photo-ia.ts` : JPEG minimal (SOI, APPn, SOS, EOI) avec XMP `Iptc4xmpExt:DigitalSourceType`, avec APP11 JUMBF contenant l'URI dans une charge CBOR factice, avec APP13 ; PNG avec `iTXt` XMP, `caBX`, `tEXt parameters` (A1111), `tEXt prompt` + `workflow` (ComfyUI) ; WebP RIFF avec `XMP ` et `C2PA`
- [ ] T034 [P] [US3] `src/lib/__tests__/photo-ia.test.ts` : chaque déclaration donne la conclusion de R6 ; `compositeWithTrainedAlgorithmicMedia` seul donne `retouchee` ; les deux termes ensemble donnent `generee` ; `digitalCapture`, `computationalCapture`, `compositeCapture` et `algorithmicallyEnhanced` donnent `null` ; M8 : le terme placé après SOS (JPEG) ou dans `IDAT` (PNG) donne `null` ; `tEXt parameters` sans `Steps:` donne `null`
- [ ] T035 [P] [US3] M7 dans le même fichier : longueur de segment qui dépasse le fichier, 10 000 segments APP vides, PNG tronqué au milieu d'un bloc, RIFF dont la taille annoncée ment, fichier vide ; jamais d'exception, résultat `null`, moins de 20 ms chacun
- [ ] T036 [P] [US3] `src/app/api/users/__tests__/photos-ia.test.ts` : téléversement d'une photo `generee` (R2 factice qui compte les écritures) : statut et réponse inchangés, photo stockée, signal `photo_ia_generee` avec `photoKey`, octets stockés sans le terme ni aucune métadonnée (#441) ; photo sans déclaration : aucun signal ; M12 : la photo est visible sur le profil
- [ ] T037 [P] [US3] Selfie : `src/app/api/moderation/__tests__/verify-ia.test.ts` : un selfie `generee` passe en file normalement et porte le signal avec le `photoKey` de la demande

### Implémentation US3

- [ ] T038 [US3] `src/lib/photo-ia.ts` : `declarationIA(buffer)` selon R6 (conteneurs, segments de métadonnées seulement, termes avec casse et borne de jeton, bornes de 2 Mo et 512 segments, aucun `throw` qui s'échappe)
- [ ] T039 [US3] `src/lib/r2.ts` : `PhotoTeleversee.ia`, calculé sur l'original avant `retirerMetadonnees`
- [ ] T040 [US3] `src/app/api/users/photos/route.ts` : passer à `televerserPhoto`, puis `after()` enregistre `photo_ia_generee` ou `photo_ia_retouchee` (clé `photo_ia:<photoKey>`, `photoKey`)
- [ ] T041 [US3] `src/app/api/moderation/verify/route.ts` : même enregistrement dans l'`after()` existant, sur la clé du selfie
- [ ] T042 [P] [US3] Libellés : `photo_ia_generee` = « Photo déclarée générée par IA par son propre fichier », `photo_ia_retouchee` = « Photo retouchée par IA » ; mention : « Peut être légitime : gomme magique ou retouche automatique du téléphone. » dans `src/lib/fraude/libelles.ts`
- [ ] T043 [US3] Carte de vérification `src/components/admin/AdminVerificationCard.tsx` (et sa route GET admin) : « Image déclarée générée par IA » à côté du code attendu quand un signal `photo_ia_*` porte le `photoKey` de la demande (US3, scénario 5) ; test de la route : le drapeau n'apparaît que pour la bonne demande
- [ ] T044 [US3] Politique de confidentialité : lecture de la déclaration d'IA avant le retrait des métadonnées ; seule la conclusion est conservée
- [ ] T045 [US3] Mutations : chercher sans la casse, chercher dans tout le fichier, retirer la priorité `generee` > `retouchee`, retirer la borne des 512 segments, calculer `ia` après `retirerMetadonnees`

**Checkpoint** : US3 testable seule.

---

## Phase 6 : User Story 4 — Lire ces indices dans la fiche et le hub (P2)

**But** : libellés en clair (pays par son nom), force, date, cas légitimes, effet sur le niveau ; Guide ; date de la table ; mesure à un mois.

**Test indépendant** : fiche d'un compte factice qui porte les trois familles d'indices.

### Tests US4 (rouges d'abord)

- [ ] T046 [P] [US4] `src/lib/moderation/__tests__/fiche-indices-013.test.ts` : `pays_connexion` avec `extrait = 'CI'` donne un libellé contenant « Côte d'Ivoire » ; `reseau_masque` `vpn` donne « … par un VPN » ; chaque nouveau type a une mention légitime sauf `photo_ia_generee` ; scénario 3 : décision « rien à signaler » puis mêmes indices, niveau inchangé ; pied « Table des réseaux du … », avec « ancienne » au-delà de 180 jours (horloge injectée)
- [ ] T047 [P] [US4] Hub trié par fiabilité : un compte `photo_ia_generee` passe avant un compte avec deux indices de contexte (`src/lib/moderation/__tests__/membres-tri-013.test.ts`, base factice)

### Implémentation US4

- [ ] T048 [US4] `src/lib/moderation/fiche.ts` : libellé enrichi par `extrait` pour `pays_connexion` (`Intl.DisplayNames('fr')`) et `reseau_masque` (catégorie), pied de date de la table
- [ ] T049 [US4] Guide et repères `src/lib/moderation/reperes.ts` : une entrée par nouvel indice (ce qu'il veut dire, ce qu'il ne prouve pas, conduite conseillée : inviter au selfie, regarder les photos), limites écrites (IPv6 non couvert, images sans déclaration invisibles, WARP) — FR-018
- [ ] T050 [US4] `scripts/agregats/indices-013.ts` : comptes en SQL par type (porteurs, puis retirés, bannis ou « rien à signaler »), sortie en nombres seulement, cases < 5 en « < 5 » ; test sur la base jetable qui vérifie le masquage et l'absence de tout identifiant dans la sortie
- [ ] T051 [US4] Gate pixel (`quickstart.md` §2.4) : captures de la fiche à 360 px en clair et 1280 px en sombre, débordement horizontal mesuré, mesure en plusieurs points ; puis ranger

**Checkpoint** : lot 2 complet (US3 + US4).

---

## Phase 7 : Finitions transverses

- [ ] T052 [P] `CLAUDE.md`, section Sécurité : paragraphe « Indices de connexion et d'image (spec 013) » (champs privés, en-tête seul, table générée, lecture d'IA avant retrait, aucune adresse)
- [ ] T053 Revues avant chaque PR : `/code-review high`, `/revue-metier`, relecture de `securite.md` ; tableau menace → parade → test dans le corps de PR
- [ ] T054 Cocher les tâches livrées dans ce fichier, `Closes #N` des stories du lot, CI verte (`lint`, `test`, Vercel) puis `gh pr ready` ; l'opérateur merge

---

## Dépendances

- Phase 2 (T003–T005) bloque tout.
- US1 et US2 partagent `src/lib/connexion/indices.ts` : US1 le crée (T015), US2 le complète (T027). Même lot, donc on les fait en séquence.
- US3 est indépendante d'US1 et US2 (seulement la phase 2).
- US4 dépend des libellés d'US1 à US3 pour être complète, mais ses tests T046 et T047 s'écrivent dès la phase 2.
- T032 exige un déploiement de prévisualisation du lot 1.

```text
Phase 2 ──► US1 ──► US2 ──► [lot 1]
   └──────► US3 ──► US4 ──► [lot 2]
```

## Parallélisme

- Phase 2 : T004 ∥ T005 (après T003).
- US1 : T006 ∥ T007 ∥ T008 ∥ T009 ∥ T010, puis T012 ∥ T018.
- US2 : T021 ∥ T022 ∥ T023, puis T024 → T025 → T026.
- US3 : T033 → (T034 ∥ T035 ∥ T036 ∥ T037), puis T038 → T039 → (T040 ∥ T041), et T042 en parallèle.
- Les lots 1 et 2 peuvent être menés en parallèle par deux agents, dans deux worktrees : leurs fichiers ne se recoupent que dans `libelles.ts` et la politique de confidentialité, à fusionner au second merge.

## Stratégie

1. **MVP** : phase 2 + US1. C'est le schéma le plus fréquent, et le plus simple à lire.
2. Lot 1 = US1 + US2, livré et observé en production.
3. Lot 2 = US3 + US4.
4. À un mois, SC-005 (T050) : l'opérateur juge l'utilité de chaque indice sur agrégats.
