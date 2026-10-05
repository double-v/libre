# Research — Indice de fiabilité (spec 010)

Constats relevés dans le code le 2026-10-05, puis décisions.

## R1 — Empreintes d'identité des bannis (FR-002, FR-003)

**Constat** : `bannissement.ts` ne copie que les empreintes de photos
(`banned_photo_fingerprints`). `User.deviceId` (localStorage, envoyé seulement
à l'inscription) et `normalizedEmail` disparaissent avec le compte.

**Décision** : table `banned_identity_fingerprints` (`kind` = `appareil` |
`email`, `hash` = HMAC-SHA256 hex). Clé = HKDF-SHA256(`NEXTAUTH_SECRET`,
info `libre:fraude:identite`). Comparaison à l'inscription dans `after()`.

**Pourquoi** : un SHA-256 nu d'un e-mail se renverse par dictionnaire ; le
HMAC ne se calcule qu'avec le secret serveur. Dérivation plutôt que nouvelle
variable : une variable absente en prod éteindrait la détection en silence
(cf. crons sans `CRON_SECRET`).

**Écarté** : garder `deviceId`/e-mail en clair (minimisation) ; variable
dédiée (oubli de configuration) ; bcrypt (lent, inutile pour une égalité).

**Limite acceptée** : rotation de `NEXTAUTH_SECRET` = empreintes inopérantes
jusqu'à expiration ; documenté dans le code.

## R2 — Blocages en rafale (FR-001)

**Constat** : `POST /api/blocks` crée une ligne `blocks(blockerId, blockedId,
createdAt)` ; aucune trace du motif.

**Décision** : dans `after()`, compter les blocages reçus par `blockedId` sur
48 h dont le bloqueur a `createdAt ≤ now − 7 j`. Seuil 3 → signal fort
`bloque_repetition`, clé `bloque:<jour du 3e blocage>` (un épisode = un signal).

**Pourquoi l'ancienneté** : neutralise trois comptes créés pour faire tomber
quelqu'un. Un débloquage ultérieur ne retire pas le signal (le modérateur
tranche).

## R3 — Rafale de likes (FR-005) — **amendement de la spec**

**Constat** : le « passer » de Découvrir est un état local
(`setPassedIds`, `discover/page.tsx`) ; il n'est **pas** envoyé au service.
La part de « passer » n'est donc pas mesurable sans créer une collecte.

**Décision** : signal fort `likes_rafale` pour un compte de moins de 7 jours
qui envoie ≥ 30 likes en 24 h glissantes **dont** ≥ 15 en 10 minutes
(index `likes(likerId, createdAt)` à ajouter). Spec amendée (FR-005,
Clarifications).

**Pourquoi** : 15 likes en 10 minutes, c'est moins de 40 s par profil, photos
et bio comprises : la signature du « like sans regarder ». Pas de nouvelle
donnée.

**Écarté** : enregistrer les « passer » (collecte nouvelle et effet de bord
UX : un « passer » mémorisé changerait Découvrir).

## R4 — Lexique de l'arnaque (FR-004)

**Décision** : `lexique.ts`, liste fixe de termes normalisés (casse, accents,
espaces et ponctuation intercalés : « p.c.s », « trans cash »), mots entiers.
Termes : `pcs`, `transcash`, `neosurf`, `coupon(s)`, `recharge(s)`,
`rencontre(s) rémunérée(s)`, `sugar daddy`, `sugar baby`, `tarif(s)`,
`cadeau(x) en échange`. Signal fort `lexique_arnaque`, extrait ≤ 200, clé =
terme. **Pas de refus** à l'écriture (ambiguïté).

**Branchement** : `analyserTexteProfil` (déjà appelée sur bio et pseudo).

## R5 — Appareil partagé et inscriptions groupées (FR-006, FR-009)

**Constat** : l'inscription refuse déjà un 3e compte par `deviceId`
(`deviceCount >= 2`). L'IP passe par `getClientIp` (rate limit), et la trace
de consentement la garde déjà en clair 3 ans pour une autre finalité.

**Décision** :
- appareil partagé : à l'inscription, si un autre compte **actif** porte le
  même `deviceId`, signal faible `appareil_partage` sur les deux (clé =
  identifiant de l'autre compte) ;
- IP : table `signup_traces(ipHash, userId, createdAt)`, HMAC de l'IP avec une
  clé HKDF distincte (info `libre:fraude:ip`), purge 7 j. ≥ 3 traces même
  `ipHash` sur 24 h → signal faible `inscriptions_groupees` sur chacun.

**Pourquoi une table et pas la trace de consentement** : finalité distincte,
durée distincte (7 j vs 3 ans) ; ne pas réutiliser une donnée hors de sa
finalité déclarée.

## R6 — Fuseau incohérent (FR-007)

**Constat** : le fuseau du navigateur n'est envoyé nulle part. La ville
manuelle passe par `PUT /api/users/profile` (`cityLabel` + position du
géocodage) ; le géocodage connaît le pays mais `Profile` ne le stocke pas.

**Décision** : le client joint `fuseau` (`Intl.DateTimeFormat().resolvedOptions().timeZone`)
**seulement** à l'enregistrement d'une ville manuelle. Le serveur calcule
`fuseauIncoherent(tz, lat, lng)` : position dans les boîtes France
métropolitaine + DROM-COM **et** fuseau hors liste (`Europe/*`, `Atlantic/Canary|Madeira|Azores`,
`Africa/Ceuta`, fuseaux des DROM-COM). `UTC`/`Etc/*`/absent = indéterminé,
aucun signal. Le fuseau n'est **jamais** écrit.

**Vigilance (principe II)** : un fuseau lointain dit où est l'appareil, pas
l'origine de la personne. Indice faible, jamais seul, et le libellé admin dit
« peut être légitime (voyage, expatriation) ».

## R7 — Profil monté d'un coup (FR-008)

**Décision** : évalué au like (`after()`), seulement si `emailVerified` date de
moins de 15 min : au moins une photo, bio non vide, ≥ 10 likes envoyés depuis
`emailVerified`. Signal faible `profil_express`, une fois par compte.

## R8 — Niveau et file (FR-011 à FR-016)

**Constat** : `dansLaFile` fait entrer un profil dès **deux** signaux
quelconques. Avec les indices de contexte, deux faibles anodins (appareil
partagé + fuseau) y suffiraient — contraire à FR-011/FR-014.

**Décision** : familles de signaux.
- `douteSerieux(recents)` = un fort **ou** ≥ 3 faibles de types différents.
- `dansLaFile` = `douteSerieux` **ou** l'ancienne règle appliquée aux seuls
  signaux de la spec 006 (les faibles de contexte n'y comptent pas).
- `niveauFiabilite(recents, isVerified)` : `douteux` si doute sérieux,
  `a_surveiller` si au moins un signal non tranché, sinon `fiable` ; badge
  vérifié = un cran de moins.
- « Récents » = postérieurs à la dernière décision (`profile_reviews.decidedAt`),
  comme aujourd'hui.

Le niveau n'est **jamais stocké** : la liste admin lit `profile_signals`
groupés par compte (≈ 170 comptes, en mémoire), puis pagine.

## R9 — Invitation automatique (FR-017 à FR-020)

**Décision** : champ privé `User.verifInviteeAt`. `evaluerCompte(userId)` est
appelée après chaque `enregistrerSignal` réussi : si `douteux`, non vérifié,
pas de retrait, pas déjà invité → pose `verifInviteeAt`, journal
`INVITE_VERIFICATION` avec `adminId = null` (auteur « automatique »).
- Bandeau : `RetraitNotice` reçoit une seconde variante, lue sur
  `GET /api/users/profile` (`invitationVerification: true`, à soi seul).
  Persistant, écartable 24 h par appareil (`libre:invitation-ecartee`) —
  c'est le « rappel » ; aucun push (la charge utile n'en dirait rien d'utile,
  et un push insistant serait un ressort d'engagement).
- Badge approuvé → `verifInviteeAt = null` (route des vérifications, comme
  `retraitAt`). Badge refusé alors qu'invité → signal fort
  `verification_refusee` → file.

**Écarté** : réutiliser `ProfileReview.decision = verification` (c'est la
décision humaine de retrait) ; un push de rappel.
