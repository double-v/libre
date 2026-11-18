# Research — Bureau de modération (spec 011)

Relevé du code au 2026-10-13. Chaque décision cite l'ancrage existant.

## R1 — Où écrire la présence (`lastSeenAt`)

- **Décision** : dans `src/proxy.ts`, qui interroge déjà la base pour chaque
  navigation authentifiée (vérification « compte existe / banni », cache 30 s
  `userCheckCache`). Le `select` gagne `lastSeenAt` ; si la date retenue est
  antérieure au jour courant (borne Europe/Paris, `borneDuJour` de
  `retention/purge.ts`), un `updateMany` conditionnel
  (`where: { id, OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: jour } }] }`)
  écrit le jour et efface `preavisInactiviteAt`. Le cache retient le jour
  écrit : une écriture par jour, par compte et par instance au plus, et le
  `where` garantit l'unicité entre instances. Best-effort : un échec est
  journalisé (`presence.failed`, sans identifiant) et ne bloque jamais la
  navigation.
- **Pourquoi** : la session est un JWT, aucune requête n'écrit sur `users` à
  la visite (#498). Le proxy est le seul point de passage commun à toutes les
  pages de l'app connectée, et il fait déjà la lecture.
- **Alternatives** : layout serveur de `(main)` (ne couvre pas tout, écriture
  pendant un rendu) ; helper de session dans 48 routes API (dispersé) ;
  table de visites (historique refusé par #498).
- **Note** : le matcher exclut `/api` ; une PWA ouverte navigue toujours vers
  une page, la présence est donc captée.

## R2 — `lastActive` reste tel quel

- **Décision** : `lastActive` (`@updatedAt`) n'est pas renommé. Il continue
  d'alimenter l'indicateur « en ligne » visible des autres membres
  (`src/lib/time.ts`, `ProfileModal`), hors périmètre. `lastSeenAt` le
  remplace dans : statistiques admin (`api/admin/stats`, `admin-analytics.ts`),
  tri « Pour toi » et « À proximité » (`api/discover`), et sert de filtre
  d'exclusion à 90 jours. Il n'est **jamais sérialisé** vers un autre membre.
- **Pourquoi** : changer la sémantique de l'indicateur public est une
  décision de vie privée séparée ; la spec ne l'a pas demandée.

## R3 — Grappes d'indices dérivées à la lecture

- **Décision** : fonction pure `construireGrappes(comptes, liens)` (union-find)
  dans `src/lib/fraude/grappes.ts`. Les liens viennent de :
  - `ProfileSignal.autreUserId` non nul et non tranché : `appareil_partage`,
    `photo_reutilisee`, `texte_reutilise` (liens symétriques déjà écrits des
    deux côtés) ;
  - `SignupTrace.ipHash` partagé (7 jours) pour `inscriptions_groupees`, dont
    la `cle` est une date et ne relie rien.
  `photo_bannie` pointe vers un compte banni : affiché comme raison, sans
  regrouper. Un compte sans lien forme une grappe d'un seul compte. « Non
  tranché » = `signauxRecents(signaux, profileReview.decidedAt)` (règle
  existante de `fiabilite.ts`).
- **Pourquoi** : rien de stocké, donc rien à désynchroniser (même choix que
  le niveau de fiabilité, spec 010 R8). ≈ 200 comptes : calcul en mémoire.
- **Alternatives** : table `clusters` (dérive à l'écriture, purge en plus).

## R4 — Doublon probable

- **Décision** : grappe de **deux** comptes, liés par `appareil_partage`,
  dont exactement un a `emailVerified` non nul. Le compte sans
  `emailVerified` est « l'orphelin ». Suppression rapide refusée si
  l'orphelin a des photos, des likes envoyés ou une conversation (cas qui ne
  devrait pas exister, edge case de la spec).
- **Alternative écartée pour la v1** : rapprocher deux comptes de même date
  de naissance et d'adresses proches (distance d'édition ≤ 2) sans appareil
  commun. À reconsidérer si SC-002 n'est pas tenu (doublons créés sur deux
  appareils).

## R5 — Gestes : une seule implémentation, unitaire et par lot

- **Décision** : extraire les effets dans `src/lib/moderation/gestes.ts` :
  `inviterVerification(adminId, userId)` (corps actuel de
  `api/admin/users/[id]/invitation`) et `deciderProfil(adminId, userId,
  decision, motif)` (corps actuel de `api/admin/profils-a-verifier/[userId]`).
  Les routes unitaires et la route de lot les appellent. Chaque appel renvoie
  `traite | ignore(raison) | echec`. Le lot boucle compte par compte (pas de
  transaction globale) : idempotence par compte, bilan honnête en cas de
  panne (FR-017).
- **Garde du retrait par lot** (clarification 2) : le serveur revérifie
  « même grappe ou tous douteux » à partir des grappes recalculées, pas
  d'après ce que le client affirme.
- « Supprimer l'orphelin » : `effacerCompte` (`src/lib/suppression-compte.ts`,
  chemin déjà utilisé par la purge `retraitsSansSelfie`) + journal
  `DELETE_DUPLICATE` + décision `rien` sur l'autre compte.

## R6 — Filtres des listes dans l'adresse

- **Décision** : hook `useFiltresUrl(defauts)` (`src/hooks/`) au-dessus de
  `useSearchParams` + `router.replace(…, { scroll: false })`. Les valeurs
  par défaut ne sont pas écrites dans l'adresse. Appliqué à : membres,
  Indices, signalements, vérifications, retours.
- **Pourquoi** : la liste des membres garde aujourd'hui `page`, `search`,
  `niveau`, `triFiabilite` en `useState` : perdus au retour arrière.
  L'adresse est la seule mémoire qui survit au retour, au rechargement et au
  partage.
- **Garde-fou** : jamais de pseudo ni d'e-mail en paramètre d'adresse ; la
  recherche texte est permise (saisie par l'opérateur, adresse locale à son
  navigateur, pas de journal serveur des paramètres de page admin).

## R7 — Navigation « Modération »

- **Décision** : `adminNavItems` (`src/app/(admin)/layout.tsx`) devient une
  liste à sections. Section « Modération » : Indices (`/admin/indices`,
  repère `indices`), Signalements, Vérifications, Retours. `/admin/profils`
  redirige vers `/admin/indices` (redirection permanente côté page). L'outil
  Photos n'est pas une page : `AdminPhotoSearch` reste monté dans les cartes
  (constat : aucune page admin ne le porte seul).
- `AdminQueues.profils` est renommé `indices` et compte les grappes non
  tranchées.

## R8 — Correction d'adresse avant vérification

- **Constat critique** : `api/auth/verify-email` vérifie le jeton (qui porte
  `userId` **et** `email`) mais ne compare pas `payload.email` à l'adresse
  actuelle du compte. Après une correction, l'ancien lien vérifierait le
  compte. **Correctif** : refuser si `normalizeEmail(payload.email) !==
  user.normalizedEmail`. C'est ce qui invalide l'ancien lien (FR-028), sans
  état côté serveur.
- **Route** : `POST /api/auth/corriger-adresse` `{ email, motDePasse,
  nouvelleAdresse }`. Limiteur `auth` existant. Réponse uniforme quand
  l'adresse ou le mot de passe ne correspondent pas (pas d'oracle). Refus si
  compte déjà vérifié ou banni. Nouvelle adresse déjà prise : même message
  neutre que l'inscription.
- **Écran d'attente** : la page de connexion avec `?registered=true`
  aujourd'hui. L'adresse saisie passe de l'inscription à l'écran par
  `sessionStorage` (jamais dans l'adresse de la page : elle finirait dans les
  journaux). Le refus de connexion d'un compte non vérifié propose le même
  formulaire.
- **Double saisie** : côté formulaire uniquement (`register/page.tsx`) ;
  comparaison après `trim` et minuscules.
- **Suggestion de domaine** : fonction pure `suggererDomaine(adresse)` dans
  `src/lib/email.ts`, liste locale de ~15 domaines, distance de
  Damerau-Levenshtein ≤ 2 sur le domaine, aucune suggestion si le domaine est
  exact ou trop éloigné.

## R9 — Règles de cycle de vie dans le moteur de purge

- **Décision** : deux entrées dans `REGLES_RETENTION` :
  - `comptesNonVerifies` : 30 j depuis `création`, `emailVerified` nul ;
  - `comptesInactifs` : 365 j depuis `dernière présence` (nouvelle valeur de
    `depuis`). L'exécuteur fait deux passes : préavis (présence ≤ J-335, pas
    de préavis, envoi d'e-mail puis `preavisInactiviteAt = now`), puis
    suppression (préavis ≤ J-30 et `lastSeenAt` toujours antérieur au
    préavis).
  - Exclusions communes : `role !== 'USER'`, `isBanned`, selfie `pending`,
    signalement ouvert visant le compte. Plafond `take: 50` par passage,
    comme `retraitsSansSelfie`.
- **Masquage Découvrir** (clarification 1) : pas une règle de conservation ;
  filtre `lastSeenAt >= J-90` dans `baseWhere` de `api/discover`.
- **E-mail de préavis** : `sendPreavisInactiviteEmail(to)` dans
  `email-send.ts`, sans nom ni contenu d'autrui ; échec journalisé sans
  adresse, le préavis est daté quand même (edge case).
- **Politique** : `confidentialite/page.tsx` lit `REGLES_RETENTION` ; la
  garde existante (promis ⇔ purgé) couvre les deux règles. Le commentaire
  « pas de règle sur les comptes » de `regles.ts` est remplacé par la
  décision du 2026-10-13.

## R10 — Migration et amorçage

- Migration additive écrite à la main : `users.last_seen_at DATE NULL`,
  `users.preavis_inactivite_at TIMESTAMP NULL`, index sur `last_seen_at`.
  Amorçage : `last_seen_at = CURRENT_DATE` pour les comptes dont l'e-mail
  est vérifié (hypothèse de la spec : la règle « 1 an » démarre à la
  livraison). Les comptes non vérifiés gardent `NULL`.
- Les deux champs rejoignent la garde de non-fuite
  `city-label-never-leaks.test.ts`.

## R11 — Données de membres hors du contexte agent

- Développement et E2E sur la base PostgreSQL locale avec seed factice
  (comptes doublons, grappes photo, inactifs datés). La mesure SC-004/SC-006
  passe par un test d'agrégat jetable (cases < 5 masquées), jamais par une
  lecture de lignes.
