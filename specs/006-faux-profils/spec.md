# Feature Specification: Détection des faux profils

**Feature Branch**: `docs/006-faux-profils`
**Created**: 2026-09-24
**Status**: Draft
**Input**: User description: "Détection des faux profils (arnaques). Cas réel du 2026-09-24 : un scammeur inscrit avec la photo volée d'une instagrameuse (retrouvable par Google Lens), un identifiant Telegram écrit sur la photo de profil ; hors de l'app il propose du sexe tarifé et demande un paiement en coupons achetés en bureau de tabac (PCS, Transcash, Neosurf). Il n'a quasiment pas écrit dans l'app : les signaux de messagerie (#370) ne l'auraient pas vu, les signaux doivent porter sur le profil. Périmètre retenu par l'opérateur : (A) outillage de modération — recherche d'image inversée en un clic depuis l'admin, manuelle ; (B) signaux automatiques gratuits, calculés chez nous, sans nouveau sous-traitant : même photo sur plusieurs comptes, contact externe dans le profil et incrusté sur les photos, forme du fichier typique d'une photo récupérée sur un réseau social (indice faible). File admin « Profils à vérifier », jamais de bannissement automatique sur un seul indicateur. Hors périmètre : recherche inversée automatique par un tiers, comparaison faciale automatique, lecture des messages."

## Contexte

Le 2026-09-24, l'opérateur a banni un compte ouvert avec la photo d'une
personne réelle, publique sur Instagram. Un identifiant Telegram était écrit
sur la photo de profil. Contacté, le compte proposait des rapports tarifés et
réclamait un paiement en coupons prépayés vendus en bureau de tabac — le
schéma d'arnaque le plus courant sur les apps de rencontre françaises.

Ce compte n'a presque rien écrit dans Libre : tout le travail d'arnaque se fait
**ailleurs**, après que la victime a suivi l'identifiant affiché. Les signaux
de messagerie (#370) ne l'auraient pas vu. Ce qui le trahissait était **sur le
profil** : une photo volée, un contact externe incrusté dessus.

Deux personnes sont lésées : le membre qui se fait escroquer, et la personne
dont la photo est volée. Les deux justifient d'agir vite, sans pour autant
traiter chaque inscrit comme un suspect.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Vérifier une photo en un clic (Priority: P1)

Un modérateur examine un profil (depuis la liste des membres, un signalement ou
la file « Profils à vérifier »). Sur chaque photo, il lance une recherche
d'image inversée dans le moteur de son choix (Google Lens, Yandex, TinEye) en
un clic, sans télécharger la photo ni la ré-envoyer à la main. Le résultat
s'ouvre dans un nouvel onglet ; c'est lui qui juge.

**Why this priority**: c'est exactement le geste qui a démasqué le compte du
2026-09-24, aujourd'hui fait à la main. C'est gratuit, n'envoie rien à un tiers
sans décision humaine, et sert immédiatement sur chaque signalement « Faux
profil ».

**Independent Test**: depuis la fiche d'un membre avec photos, cliquer
« Rechercher cette image » sur une photo ouvre le moteur choisi avec cette
photo, et l'action apparaît au journal de modération.

**Acceptance Scenarios**:

1. **Given** un modérateur sur la fiche d'un membre qui a trois photos, **When** il choisit « Google Lens » sur la deuxième, **Then** un nouvel onglet ouvre la recherche de cette photo-là, et seulement celle-ci.
2. **Given** la même fiche, **When** la recherche est lancée, **Then** le journal de modération enregistre qui a lancé quelle recherche, sur quel membre, quand.
3. **Given** un membre qui n'est pas modérateur, **When** il tente d'obtenir le lien de recherche d'une photo, **Then** il est refusé.
4. **Given** une photo classée sensible, **When** le modérateur la recherche, **Then** c'est l'original qui est cherché (le flou fausserait la recherche) — le modérateur y a déjà accès (#323).

---

### User Story 2 - Repérer le contact externe affiché sur un profil (Priority: P1)

Quand un membre enregistre son pseudo ou sa bio, ou ajoute une photo, le
service repère un identifiant de contact externe : `@pseudo`, lien `t.me/…`,
mention de Telegram, Snapchat, WhatsApp, Signal, OnlyFans, Instagram, ou un
numéro de téléphone — y compris écrit **sur** la photo. Le profil entre alors
dans la file « Profils à vérifier » avec le motif et l'extrait en cause.

**Why this priority**: c'est le signal le plus fort du cas réel, et il vise le
cœur du schéma d'arnaque : faire sortir la victime de l'app. Il est gratuit et
calculé chez nous.

**Independent Test**: enregistrer une bio « écris-moi sur t.me/xyz » met le
profil dans la file avec le motif « Contact externe dans la bio » ; ajouter une
photo portant « @xyz » en surimpression fait de même avec « Contact externe
sur une photo ».

**Acceptance Scenarios**:

1. **Given** un membre, **When** il enregistre une bio contenant un numéro de téléphone français, **Then** le profil entre dans la file avec le motif « Contact externe dans la bio » et l'extrait repéré.
2. **Given** un membre, **When** il ajoute une photo portant un identifiant Telegram lisible, **Then** le profil entre dans la file avec le motif « Contact externe sur une photo » et la photo concernée.
3. **Given** une bio qui cite « Telegram » sans identifiant (« je n'utilise pas Telegram »), **When** elle est enregistrée, **Then** le signal est au plus faible, jamais fort.
4. **Given** un profil déjà dans la file, **When** un nouveau signal arrive, **Then** il s'ajoute à la même entrée au lieu d'en créer une seconde.

---

### User Story 3 - La même photo sur plusieurs comptes (Priority: P2)

Quand une photo ajoutée ressemble presque à l'identique à une photo d'un autre
compte — actuel ou banni —, les deux comptes entrent dans la file avec le motif
« Photo déjà utilisée par un autre compte ». La ressemblance tient compte d'un
recadrage léger, d'une recompression ou d'un redimensionnement.

**Why this priority**: les arnaqueurs recyclent les mêmes photos d'un compte
banni au suivant. Sans ce signal, bannir ne sert qu'une fois.

**Independent Test**: bannir un compte, puis ajouter à un autre compte la même
photo recompressée et légèrement recadrée : le second compte entre dans la file
avec la référence au compte banni.

**Acceptance Scenarios**:

1. **Given** un compte banni dont la photo a été retenue, **When** un nouveau compte ajoute cette photo recompressée, **Then** le nouveau compte entre dans la file avec le motif « Photo d'un compte banni », niveau fort.
2. **Given** deux comptes actifs, **When** l'un ajoute une photo quasi identique à celle de l'autre, **Then** les deux entrent dans la file avec un renvoi l'un vers l'autre.
3. **Given** un membre qui ajoute deux fois sa propre photo, **When** la comparaison tourne, **Then** aucun signal n'est levé (même compte).

---

### User Story 4 - Trancher un profil à vérifier (Priority: P2)

La file « Profils à vérifier » présente chaque profil avec ses signaux (motif,
force, extrait, photo en cause), ses photos avec la recherche inversée (US1),
son ancienneté, son statut de badge vérifié et les signalements reçus. Le
modérateur tranche : « Rien à signaler », « Demander une vérification » ou
« Bannir ». Chaque décision est journalisée avec son auteur.

**Why this priority**: sans décision humaine outillée, les signaux ne sont que
du bruit. C'est la surface qui transforme US2 et US3 en actions.

**Independent Test**: un profil avec un signal apparaît dans la file ;
« Rien à signaler » le retire et le journal le montre ; « Bannir » le bannit par
le chemin de bannissement existant.

**Acceptance Scenarios**:

1. **Given** une file de trois profils, **When** le modérateur l'ouvre, **Then** les profils aux signaux forts passent avant les faibles, et à force égale, le plus récent d'abord.
2. **Given** un profil marqué « Rien à signaler », **When** un signal **nouveau** (d'un autre type ou sur un autre contenu) arrive, **Then** le profil revient dans la file ; le même signal sur le même contenu ne le fait pas revenir.
3. **Given** un modérateur qui choisit « Demander une vérification », **Then** le profil est **mis en retrait** — absent de Découvrir et de toute liste de profils, et il ne peut plus envoyer de message — jusqu'à l'obtention du badge vérifié (#436) ; le membre voit une invitation à se faire vérifier, sans mention de soupçon.
6. **Given** un profil mis en retrait qui obtient le badge, **Then** il sort du retrait sans autre intervention ; **Given** un refus du badge, **Then** il reste en retrait et revient dans la file.
4. **Given** un modérateur qui bannit depuis la file, **Then** les photos du compte sont retenues pour la détection de réutilisation (US3).
5. **Given** l'administration, **When** la file a des entrées non traitées, **Then** le compteur de la barre admin l'affiche comme les autres files.

---

### User Story 5 - Indice faible : la photo « récupérée » (Priority: P3)

Une photo dont le fichier a la forme typique d'une image enregistrée depuis un
réseau social (dimensions standard de ces plateformes, sans aucune information
d'appareil) ajoute un indice **faible** au profil. Seul, il ne fait jamais
entrer un profil dans la file ; il pèse dans l'ordre de la file quand d'autres
signaux existent.

**Why this priority**: indice bon marché mais bruyant — beaucoup de membres
honnêtes réutilisent leurs propres photos Instagram. Utile pour départager,
jamais pour accuser.

**Independent Test**: une photo au format typique sans information d'appareil,
sur un profil sans autre signal, ne crée aucune entrée ; sur un profil déjà dans
la file, l'indice apparaît dans la liste de ses signaux.

**Acceptance Scenarios**:

1. **Given** un profil sans autre signal, **When** il ajoute une photo au format typique d'un réseau social, **Then** aucune entrée n'est créée dans la file.
2. **Given** un profil déjà dans la file, **When** il porte cet indice, **Then** l'indice est listé avec la mention « indice faible ».

---

### Edge Cases

- **Faux positifs honnêtes** : un membre veut écrire son Instagram dans sa bio par habitude → la règle le lui dit, il retire le contact ; une photo porte un texte anodin (« Paris 2024 ») → le modérateur voit l'extrait et tranche « Rien à signaler » ; aucune sanction sans décision humaine.
- **Faux positif à l'écriture** : un mot anodin pris pour un contact (« @ bientôt ») bloque l'enregistrement → le motif affiché nomme l'extrait en cause pour que le membre reformule ; les formes ambiguës (mot seul sans identifiant) ne bloquent pas, elles ne lèvent qu'un signal faible.
- **Contournement de l'écriture** : « t . m e / x y z », « télégramme », chiffres écrits en lettres, emoji entre les caractères. → Les variantes courantes (espaces, points, lettres accentuées, homoglyphes simples) sont reconnues ; l'exhaustivité n'est pas visée, la recherche inversée et la file restent le filet.
- **Texte illisible sur la photo** (police stylisée, très petit) : non repéré — accepté, la recherche inversée couvre ce cas.
- **Photos déjà en ligne avant la fonctionnalité** : les profils existants sont analysés une fois, sans prévenir personne ni rien bloquer.
- **Photo supprimée par le membre** : ses signaux restent attachés à l'entrée de file (le modérateur doit voir pourquoi le profil était là), mais l'empreinte de la photo d'un compte actif est oubliée avec la photo.
- **Suppression de compte** : toutes les données de détection du membre partent avec le compte (cascade), sauf les empreintes retenues d'un compte **banni** (US3), gardées 1 an.
- **Analyse en échec** (image corrompue, lecture du texte impossible) : l'ajout de la photo n'échoue jamais pour autant ; l'échec est journalisé sans donnée personnelle.
- **Un compte signalé « Faux profil » par un membre** entre dans la même file, avec le signalement comme motif.

## Requirements *(mandatory)*

### Functional Requirements

**Outillage de modération (US1)**

- **FR-001**: Un modérateur MUST pouvoir lancer, sur chaque photo d'un profil, une recherche d'image inversée dans Google Lens, Yandex ou TinEye, en un clic, ouverte dans un nouvel onglet.
- **FR-002**: Le lien fourni au moteur MUST être à durée de vie courte et ne donner accès qu'à cette photo.
- **FR-003**: Chaque recherche lancée MUST être journalisée (modérateur, membre, photo, moteur, date).
- **FR-004**: Aucune photo de membre MUST NOT être envoyée à un tiers sans ce geste explicite d'un modérateur.

**Signaux (US2, US3, US5)**

- **FR-005**: Le service MUST repérer un contact externe dans le pseudo et la bio à chaque enregistrement : identifiant `@…`, liens et noms de messageries et réseaux (Telegram, Snapchat, WhatsApp, Signal, OnlyFans, Instagram), numéros de téléphone.
- **FR-006**: Le service MUST lire le texte incrusté sur chaque photo ajoutée et y appliquer la même détection que FR-005.
- **FR-007**: Le service MUST calculer pour chaque photo ajoutée une empreinte de ressemblance, tolérante au recadrage léger, à la recompression et au redimensionnement, et la comparer aux empreintes des autres comptes (actifs et bannis retenus).
- **FR-008**: Le service MUST relever l'indice faible « forme de photo récupérée » (US5) sans jamais créer d'entrée de file sur ce seul indice.
- **FR-009**: Chaque signal MUST porter un type, une force (faible / fort), le contenu en cause (extrait de texte ou référence de photo) et sa date.
- **FR-010**: Toute analyse MUST s'exécuter après l'enregistrement, sans retarder ni faire échouer l'action du membre.
- **FR-011**: Les profils existants MUST être analysés une fois au déploiement.
- **FR-012**: Aucun signal, score ni entrée de file MUST NOT être visible du membre concerné ni d'aucun autre membre (pas de message « ton profil est suspect »). Seules sont visibles au membre la règle de FR-020 et, en cas de retrait, l'invitation à se faire vérifier.

**File « Profils à vérifier » (US4)**

- **FR-013**: Les profils portant au moins un signal fort, ou au moins deux signaux, ou un signalement « Faux profil », MUST apparaître dans une file admin unique.
- **FR-014**: La file MUST montrer pour chaque profil : ses signaux, ses photos avec la recherche inversée, son ancienneté, son statut de badge vérifié, les signalements reçus.
- **FR-015**: Le modérateur MUST pouvoir trancher « Rien à signaler », « Demander une vérification » ou « Bannir » ; chaque décision MUST être journalisée avec son auteur.
- **FR-016**: Un profil tranché « Rien à signaler » MUST revenir dans la file uniquement sur un signal nouveau.
- **FR-017**: Le système MUST NOT prendre de sanction automatique (bannissement, masquage) sans décision d'un modérateur.
- **FR-018**: Au bannissement, les empreintes des photos du compte MUST être retenues pour la détection de réutilisation pendant **1 an**, sans la photo elle-même, puis effacées par la purge de rétention (#427). La durée figure dans le tableau de conservation de la politique.
- **FR-018b**: « Demander une vérification » MUST mettre le profil en retrait : absent de Découvrir et de toute liste de profils lue par d'autres membres, envoi de messages refusé, jusqu'à l'obtention du badge vérifié ; l'obtention du badge MUST lever le retrait sans intervention.
- **FR-019**: La file MUST alimenter le compteur de la barre admin comme les autres files.

**Contact externe dans la bio au moment de l'écriture**

- **FR-020**: Quand un membre enregistre une bio ou un pseudo contenant un contact externe, le système MUST refuser l'enregistrement avec un message qui énonce la règle sans accuser (« Les contacts se partagent dans la messagerie, une fois le match fait. »), **et** ajouter la tentative comme signal au profil.
- **FR-021**: Un contact externe repéré sur une **photo** MUST seulement lever un signal (la photo reste en ligne jusqu'à la décision du modérateur) : la lecture du texte se fait après l'ajout et peut se tromper.

### Key Entities *(include if feature involves data)*

- **Signal de profil** : un indice sur un profil — type (contact externe bio/pseudo, contact externe photo, photo réutilisée, photo récupérée, signalement), force, contenu en cause, date. Appartient à un membre ; supprimé avec lui.
- **Empreinte de photo** : la signature de ressemblance d'une photo, rattachée à la photo tant qu'elle existe ; retenue après bannissement du compte pour une durée bornée, sans la photo elle-même.
- **Entrée de file « Profil à vérifier »** : un profil, ses signaux, son état (à vérifier, tranché) et la dernière décision.
- **Décision de modération** : auteur, profil, décision, date — dans le journal de modération existant.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Rejoué sur le compte du 2026-09-24 (photo avec identifiant Telegram), le profil entre dans la file dans les 5 minutes qui suivent l'ajout de la photo.
- **SC-002**: Un modérateur lance une recherche d'image inversée sur une photo en moins de 10 secondes depuis la fiche du membre, sans téléchargement.
- **SC-003**: Une photo d'un compte banni, recompressée et recadrée jusqu'à 10 %, est reconnue sur un nouveau compte dans au moins 9 cas sur 10.
- **SC-004**: Moins d'un profil sur dix dans la file est tranché « Rien à signaler » sur un signal **fort** (le signal fort reste fiable).
- **SC-005**: Aucune action d'un membre (enregistrer le profil, ajouter une photo) ne devient plus lente de façon perceptible.
- **SC-006**: Aucune réponse lue par un membre ne contient de signal, de score ou de mention de la file.

## Assumptions

- Le volume est celui d'un lancement (quelques dizaines de profils) : la file est traitée à la main par l'opérateur ; aucune garantie de délai n'est affichée.
- La lecture du texte sur les photos et le calcul d'empreinte se font **chez nous**, sans service tiers ni nouveau sous-traitant ; seule la recherche inversée manuelle (US1) sort une photo, sur geste explicite d'un modérateur.
- Les signaux sont des traitements de sécurité au titre de l'intérêt légitime (lutte contre la fraude) ; la politique de confidentialité le mentionne avec les durées de conservation, dans le même tableau que les autres durées (#427).
- Le bannissement réutilise le chemin existant ; « Demander une vérification » s'appuie sur le badge vérifié par selfie (#436).
- Décisions de l'opérateur du 2026-09-24 : mise en retrait sur « Demander une vérification », empreintes des comptes bannis gardées 1 an, contact externe refusé à l'écriture de la bio et du pseudo.
- La prévention côté membres (messages sur les coupons prépayés, conseils de sécurité) relève de #369 et reste hors de cette spec.
- Les signaux de messagerie (#370) restent un chantier distinct ; la file « Profils à vérifier » est conçue pour les accueillir plus tard.
