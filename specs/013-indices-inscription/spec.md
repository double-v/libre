# Feature Specification: Indices réseau et image à l'inscription

**Feature Branch**: `docs/013-indices-inscription`

**Created**: 2026-11-12

**Status**: Draft

**Input**: User description: "Indices réseau et image à l'inscription. L'opérateur est seul modérateur ; aucun match ni message n'a encore eu lieu sur le site ; il n'a pas d'intuition fiable pour reconnaître un faux profil (surtout d'homme) hormis des photos « trop clean ou étrangement exposées », et dépend donc des indices. Les indices de la spec 010 ne suffisent pas. Ajouter, sans jamais stocker l'adresse IP ni la position : (1) le pays de connexion comparé au pays de la ville déclarée ; (2) la nature du réseau (hébergeur, VPN, proxy) via une base locale, sans service extérieur ; (3) la mention « image générée par IA » lue dans les métadonnées des photos avant leur retrait. Ces indices alimentent le niveau de fiabilité et la fiche admin ; jamais de sanction automatique ; booléens ou codes pays seulement ; contrainte Vercel Hobby ; repo public. Le selfie en deux temps (#561) est hors périmètre."

## Contexte

Libre est en lancement. Il n'y a encore eu **ni match ni message** : les
parades déclenchées au premier contact n'ont rien sur quoi s'appuyer. Le
moment où un faux compte se révèle le plus, c'est **l'inscription et le
remplissage du profil**.

L'opérateur modère seul. Il reconnaît mal les faux profils, surtout ceux
d'hommes : en dehors de photos « trop propres » ou à l'exposition étrange, il
n'a pas d'intuition fiable. Il dépend donc des indices. Ceux des specs 006 et
010 (contact externe, photo réutilisée, fuseau horaire incohérent, appareil
partagé, inscriptions groupées, lexique de l'arnaque…) ne suffisent pas.

Deux familles d'indices manquent, et elles visent les schémas les plus
courants des arnaques sentimentales :

1. **D'où vient la connexion.** Un compte qui dit vivre à Lyon mais se
   connecte depuis un autre pays, ou depuis un réseau d'hébergement ou un
   VPN, cache souvent quelque chose. Un brouteur change facilement de photos,
   de bio et de compte ; il cache rarement les trois à la fois que sont le
   pays, le réseau et le fuseau horaire.
2. **D'où vient l'image.** Plusieurs générateurs d'images et outils d'édition
   écrivent dans le fichier qu'une image a été générée par IA. Libre retire
   déjà toutes les métadonnées des photos avant de les stocker (#441) ; on
   peut lire cette mention juste avant, sans rien conserver d'autre.

Ces indices ne décident rien. Ils s'ajoutent à ceux qui existent, nourrissent
le niveau de fiabilité et apparaissent dans la fiche du membre (spec 012),
pour que le modérateur sache **où regarder** et **pourquoi**.

## Clarifications

### Session 2026-11-12

- Q : Les pays voisins (Belgique, Suisse, Luxembourg, Monaco) comptent-ils comme « chez soi » pour une ville française ? → R : Non, comme n'importe quel autre pays ; la force faible et la mention « frontalier » suffisent à protéger les vrais membres.
- Q : Quelle force pour l'indice de pays ? → R : Contexte faible : il ne pèse qu'avec deux autres types différents.
- Q : Que devient une photo de profil déclarée générée par IA ? → R : Elle est acceptée et affichée normalement ; seul l'indice fort est enregistré, la décision revient au modérateur.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Connexion depuis un autre pays que celui de la ville déclarée (Priority: P1)

Un compte s'inscrit en indiquant une ville en France. À l'inscription, puis
aux connexions suivantes, le pays depuis lequel il se connecte est comparé
au pays de sa ville. S'ils diffèrent, la fiche du membre affiche un indice
« Connexion depuis un autre pays que celui de sa ville », avec le pays de
connexion. Le modérateur le voit dans le hub Membres, filtré par « Indices »,
et peut décider d'inviter au selfie, de mettre en retrait ou de ne rien faire.

**Why this priority** : c'est le schéma le plus fréquent des arnaques
sentimentales visant la France, et l'indice le plus simple à lire pour un
modérateur seul.

**Independent Test** : avec des comptes factices, simuler une inscription
depuis un autre pays que celui de la ville déclarée, puis vérifier que
l'indice apparaît dans la fiche, avec le pays, et qu'il pèse dans le niveau
de fiabilité. Simuler aussi le cas inverse (même pays) et vérifier
qu'aucun indice n'apparaît.

**Acceptance Scenarios** :

1. **Given** un membre dont la ville déclarée est en France, **When** il
   s'inscrit depuis une connexion située dans un autre pays, **Then** un
   indice « connexion depuis un autre pays » est enregistré, avec le code
   du pays de connexion, et rien d'autre sur la connexion.
2. **Given** ce même membre, **When** il se reconnecte plusieurs fois depuis
   le même pays étranger, **Then** l'indice n'est pas dupliqué ; **When** il
   se connecte depuis un troisième pays, **Then** ce nouveau pays s'ajoute à
   l'indice.
3. **Given** un membre qui n'a pas encore indiqué de ville, **When** il se
   connecte depuis l'étranger, **Then** le pays de connexion est retenu, et
   l'indice est évalué au moment où il indique sa ville.
4. **Given** un membre qui se connecte depuis le pays de sa ville, **When**
   la fiche s'affiche, **Then** aucun indice de pays n'apparaît.
5. **Given** un indice de pays, **When** le modérateur ouvre la fiche,
   **Then** il lit le pays de connexion en clair (« Côte d'Ivoire »), la
   ville déclarée, et une mention des cas légitimes possibles (voyage,
   expatriation, frontalier).

---

### User Story 2 — Connexion depuis un réseau d'hébergement ou un VPN (Priority: P1)

Un compte s'inscrit ou se connecte depuis une adresse qui appartient à un
hébergeur (serveurs, centres de données) ou à un service de VPN ou de proxy
connu. La fiche affiche un indice « Connexion par un réseau d'hébergement ou
un VPN ». La nature du réseau est déterminée localement, sans interroger de
service extérieur, et seule la catégorie est conservée.

**Why this priority** : les robots et une grande partie des brouteurs passent
par des serveurs ou des VPN pour masquer leur pays ; cet indice rattrape les
cas où la User Story 1 voit « France » à tort.

**Independent Test** : avec une table de réseaux factice, simuler une
inscription depuis une adresse d'hébergeur, puis depuis un relais de
confidentialité grand public, puis depuis un fournisseur d'accès
résidentiel ou mobile ; vérifier que seule la première lève l'indice.

**Acceptance Scenarios** :

1. **Given** une connexion depuis une adresse d'hébergeur ou de VPN connu,
   **When** le membre s'inscrit ou se connecte, **Then** un indice « réseau
   d'hébergement ou VPN » est enregistré, avec la catégorie seule
   (hébergement, VPN ou proxy), sans l'adresse ni le nom de l'opérateur.
2. **Given** une connexion par un relais de confidentialité intégré au
   téléphone ou au navigateur (par exemple le relais privé d'Apple), **When**
   le membre se connecte, **Then** aucun indice n'est levé : ces relais sont
   utilisés par défaut par beaucoup de personnes honnêtes.
3. **Given** une connexion depuis un fournisseur d'accès résidentiel ou
   mobile, **When** le membre se connecte, **Then** aucun indice n'est levé.
4. **Given** une adresse absente de la table des réseaux, **When** le membre
   se connecte, **Then** aucun indice n'est levé (dans le doute, on
   s'abstient).

---

### User Story 3 — Photo déclarée générée par IA (Priority: P1)

Un membre téléverse une photo dont le fichier déclare lui-même avoir été
généré par une IA (marqueur de source numérique, manifeste de provenance, ou
signature logicielle d'un générateur connu). Avant le retrait des
métadonnées, Libre lit cette déclaration et enregistre un indice fort
« Photo déclarée générée par IA » sur la photo et le compte. La photo
elle-même est acceptée normalement : la décision revient au modérateur.

**Why this priority** : c'est l'indice le plus proche de ce que l'opérateur
voit à l'œil (« photos trop propres ») ; quand il est présent, il est
quasiment certain.

**Independent Test** : téléverser des images factices portant chacune une
déclaration différente (générée, retouchée par IA, aucune) et vérifier
l'indice levé, sa force, et que la photo stockée ne contient plus aucune
métadonnée.

**Acceptance Scenarios** :

1. **Given** une image dont les métadonnées déclarent une génération
   complète par IA, **When** le membre la téléverse, **Then** un indice fort
   « photo déclarée générée par IA » est enregistré, rattaché à cette photo,
   et la photo est acceptée et affichée normalement (FR-014).
2. **Given** une image déclarée seulement **retouchée** par IA (effacement
   d'un objet, amélioration automatique du téléphone), **When** le membre la
   téléverse, **Then** un indice faible « photo retouchée par IA » est
   enregistré, et la photo est acceptée normalement.
3. **Given** une image sans aucune déclaration, **When** le membre la
   téléverse, **Then** aucun indice n'est levé à ce titre.
4. **Given** n'importe laquelle de ces images, **When** elle est stockée,
   **Then** elle ne contient plus aucune métadonnée (règle #441 inchangée),
   et seule la conclusion (générée, retouchée, rien) est conservée.
5. **Given** le selfie de vérification, **When** il porte une déclaration de
   génération par IA, **Then** l'indice fort est enregistré aussi, et la
   carte de modération l'affiche à côté du code attendu.

---

### User Story 4 — Lire ces indices dans la fiche et le hub (Priority: P2)

Le modérateur filtre le hub Membres sur « Indices » et voit ces nouveaux
indices avec les autres, chacun avec son libellé en clair, sa force, sa date
et, pour les indices de contexte, les cas légitimes possibles. Il les lit
dans le Guide de modération (spec 012) avec la conduite conseillée.

**Why this priority** : sans lecture claire, un indice de plus est un bruit
de plus pour un modérateur seul.

**Independent Test** : afficher la fiche d'un compte factice portant les
trois nouveaux indices et vérifier libellés, forces, mentions légitimes et
leur effet sur le niveau de fiabilité.

**Acceptance Scenarios** :

1. **Given** un compte portant un indice de pays et un indice de réseau,
   **When** le modérateur ouvre sa fiche, **Then** il lit les deux indices,
   le pays en clair, la catégorie de réseau, et pour chacun ce qui pourrait
   l'expliquer honnêtement.
2. **Given** un compte portant un indice fort de photo générée, **When** le
   hub est trié par fiabilité, **Then** ce compte remonte comme « douteux ».
3. **Given** une décision du modérateur (« rien à signaler »), **When** les
   mêmes indices se répètent ensuite, **Then** ils ne relèvent pas le niveau
   de fiabilité (règle des signaux postérieurs à la dernière décision,
   spec 010).

---

### Edge Cases

- **Voyage, expatriation, frontalier** : un vrai membre en vacances ou vivant
  près d'une frontière déclenche l'indice de pays. D'où sa force faible et
  la mention des cas légitimes.
- **Départements et collectivités d'outre-mer** : une connexion depuis La
  Réunion, la Guadeloupe ou la Nouvelle-Calédonie avec une ville déclarée
  dans le même territoire, ou en France métropolitaine, n'est pas une
  connexion « depuis l'étranger ».
- **Relais de confidentialité grand public** (relais privé d'Apple, réseaux
  d'opérateurs mobiles qui mutualisent les adresses) : jamais d'indice
  réseau.
- **Pays de connexion inconnu** (en-tête absent, adresse non répertoriée) :
  aucun indice, jamais un indice par défaut.
- **Réseau d'entreprise ou d'école** qui sort par un hébergeur : faux
  positif possible, d'où la force faible et la règle des trois types
  différents (spec 010).
- **Changement de ville** : l'indice de pays est réévalué avec la nouvelle
  ville ; il ne disparaît pas de l'historique.
- **Photo d'un appareil qui ajoute lui-même un manifeste de provenance**
  (certains téléphones signent leurs photos) : une photo signée « prise par
  l'appareil » n'est pas un indice ; seules les déclarations de génération
  ou de retouche par IA comptent.
- **Métadonnées falsifiées** : un fraudeur peut retirer la déclaration ;
  l'absence de déclaration ne prouve donc rien et ne baisse jamais le
  niveau de doute.
- **Comptes existants** : leurs photos ont déjà perdu leurs métadonnées ;
  l'indice d'image ne vaut que pour les photos téléversées après la
  livraison. Les indices de connexion s'appliquent dès leur prochaine
  connexion.
- **Panne ou base de réseaux absente** : l'inscription et la connexion se
  font normalement, sans indice ; jamais un refus.

## Requirements *(mandatory)*

### Functional Requirements

**Pays de connexion**

- **FR-001** : À l'inscription et à chaque connexion, le système DOIT
  déterminer le pays de la connexion, sans conserver l'adresse.
- **FR-002** : Le système DOIT comparer ce pays au pays de la ville déclarée
  par le membre ; les territoires d'outre-mer comptent comme la France.
  Les pays voisins (Belgique, Suisse, Luxembourg, Monaco…) comptent comme
  n'importe quel autre pays : la force faible et la mention « frontalier »
  protègent les vrais membres.
- **FR-003** : Quand les deux pays diffèrent, le système DOIT enregistrer un
  indice « connexion depuis un autre pays », avec le code du pays de
  connexion, une seule fois par pays et par compte. C'est un indice de
  **contexte faible** : il ne fait passer un compte en « douteux » qu'avec
  deux autres indices de types différents (règle de la spec 010), comme le
  fuseau horaire.
- **FR-004** : Sans ville déclarée, le système DOIT retenir les pays de
  connexion et évaluer l'indice quand la ville est indiquée.
- **FR-005** : Le pays de connexion DOIT être réévalué si le membre change
  de ville.

**Nature du réseau**

- **FR-006** : À l'inscription et à chaque connexion, le système DOIT
  classer le réseau de connexion en « hébergement », « VPN ou proxy »,
  « relais de confidentialité grand public » ou « ordinaire », à l'aide
  d'une table conservée chez Libre, sans interroger de service extérieur.
- **FR-007** : Une connexion classée « hébergement » ou « VPN ou proxy » DOIT
  lever un indice de contexte faible « réseau d'hébergement ou VPN », avec
  la seule catégorie.
- **FR-008** : Les relais de confidentialité grand public et les adresses
  non répertoriées NE DOIVENT JAMAIS lever d'indice.
- **FR-009** : La table des réseaux DOIT pouvoir être mise à jour par une
  PR, avec sa date de mise à jour visible dans les outils admin.

**Image déclarée générée**

- **FR-010** : Avant le retrait des métadonnées de toute photo téléversée
  (profil et selfie), le système DOIT lire si le fichier déclare une
  génération par IA (marqueur de source numérique, manifeste de provenance,
  signature logicielle d'un générateur connu).
- **FR-011** : Une génération complète DOIT lever un indice **fort**
  « photo déclarée générée par IA », rattaché à la photo et au compte.
- **FR-012** : Une retouche par IA DOIT lever un indice faible « photo
  retouchée par IA ».
- **FR-013** : Seule la conclusion (générée, retouchée, rien) DOIT être
  conservée ; le manifeste et les métadonnées sont retirés comme toutes les
  autres (#441).
- **FR-014** : Une photo de profil déclarée générée par IA DOIT être
  acceptée et affichée normalement : l'indice fort suffit, la décision
  revient au modérateur.

**Lecture et décision**

- **FR-015** : Les nouveaux indices DOIVENT apparaître dans la fiche du
  membre (spec 012) avec un libellé en clair, leur force, leur date et,
  pour les indices de contexte, les cas légitimes possibles.
- **FR-016** : Les nouveaux indices DOIVENT entrer dans le niveau de
  fiabilité selon les règles de la spec 010 (un fort, ou trois faibles de
  types différents ; signaux postérieurs à la dernière décision).
- **FR-017** : Aucun de ces indices NE DOIT entraîner de sanction
  automatique (RGPD art. 22) ; ils peuvent au plus déclencher l'invitation
  automatique au selfie existante (spec 010).
- **FR-018** : Le Guide de modération DOIT décrire chaque nouvel indice et
  la conduite conseillée.
- **FR-019** : La politique de confidentialité DOIT décrire ces nouveaux
  traitements (pays et nature de la connexion, lecture de la déclaration
  d'IA), leur base légale (intérêt légitime, sécurité des membres) et ce
  qui est conservé.

**Sécurité et vie privée**

- **FR-S01** : L'adresse IP, l'opérateur réseau, la position et le
  manifeste de provenance NE DOIVENT JAMAIS être stockés ni journalisés ;
  seuls un code pays, une catégorie de réseau et une conclusion d'image le
  sont.
- **FR-S02** : Ces indices NE DOIVENT JAMAIS être lus par d'autres membres
  ni par le membre lui-même (champs privés, garde existante de non-fuite).
- **FR-S03** : Le pays de connexion DOIT venir d'une source que le client
  ne contrôle pas (en-tête posé par l'hébergeur), jamais d'un en-tête ou
  d'un champ envoyé par le navigateur.
- **FR-S04** : La lecture de la déclaration d'IA DOIT résister à un fichier
  piégé (taille, manifeste démesuré, structure invalide) : en cas de doute,
  aucun indice, et le téléversement suit son cours normal.
- **FR-S05** : Le calcul DOIT rester léger (pas d'appel réseau, pas de
  décodage d'image supplémentaire) pour tenir dans l'offre gratuite de
  l'hébergeur.

### Key Entities

- **Indice de connexion** : un signal de fiabilité (spec 010) de
  type « pays » ou « réseau », portant un code pays ou une catégorie, une
  force et une date. Une seule ligne par pays ou par catégorie et par
  compte.
- **Pays de connexion en attente** : les codes pays vus avant que la ville
  ne soit déclarée, conservés le temps de l'évaluation.
- **Indice d'image** : un signal rattaché à une photo, portant la conclusion
  « générée » ou « retouchée ».
- **Table des réseaux** : la correspondance entre blocs d'adresses et
  catégories de réseau, versionnée dans le dépôt, avec sa date.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** : Sur un jeu de comptes factices couvrant les schémas visés
  (inscription depuis l'étranger, par un hébergeur, avec une photo déclarée
  générée), 100 % des comptes portent l'indice attendu, et aucun compte
  témoin (connexion ordinaire depuis le pays de sa ville, photo d'appareil)
  n'en porte.
- **SC-002** : Aucune adresse IP, aucun nom d'opérateur, aucune position ni
  aucun manifeste n'apparaît dans la base, les journaux ou une réponse
  d'API (vérifié par les gardes de non-fuite).
- **SC-003** : L'inscription et la connexion ne sont pas ralenties de façon
  perceptible : le temps ajouté reste sous 50 ms en moyenne.
- **SC-004** : Le modérateur comprend chaque nouvel indice sans aide : le
  libellé, le pays ou la catégorie, et les cas légitimes tiennent dans la
  fiche sans ouvrir d'autre page.
- **SC-005** : Après un mois en production, l'opérateur dispose, en
  agrégats seulement (cases inférieures à 5 masquées), de la part des
  comptes retirés ou bannis qui portaient chacun de ces indices, pour juger
  leur utilité.

## Assumptions

- Le site vise d'abord des membres vivant en France, outre-mer compris ;
  une ville déclarée hors de France reste possible (géocodage
  international) et l'indice compare alors au pays de cette ville.
- L'hébergeur actuel fournit le pays de connexion dans un en-tête qu'il pose
  lui-même ; à défaut, une base locale de correspondance adresse → pays
  peut s'y substituer sans service extérieur.
- Une table publique et libre de droits classant les réseaux (hébergeurs,
  VPN connus, relais grand public) est disponible et peut être versionnée
  dans le dépôt ; sa taille reste compatible avec les fonctions de
  l'hébergeur.
- Les déclarations d'IA lisibles sont celles des normes de provenance et de
  métadonnées répandues ; elles n'existent que si le générateur les a
  écrites et que personne ne les a retirées. L'indice a donc une bonne
  précision et un rappel limité, ce qui est assumé.
- Le selfie en deux temps (#561) est hors périmètre ; il réutilisera la
  lecture d'IA de cette spec.
- La base légale est l'intérêt légitime (sécurité des membres, art. 6(1)(f)),
  déjà retenue pour l'indice de fiabilité (spec 010).
