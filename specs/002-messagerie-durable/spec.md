# Feature Specification: Messagerie privée durable — la clé survit, le fil reste lisible

**Feature Branch**: `002-messagerie-durable`

**Created**: 2026-08-17

**Status**: Clarifié — prêt pour le plan

**Clarifications** : 2026-08-17, avec l'opérateur (3 décisions sur le lot rétention, cf. § Décisions tranchées)

**Épic**: #197 — couvre #198 (escrow de clé), #199 (clé de conversation et historique), #202 (rétention et messages éphémères)

**Input**: User description: « on va utiliser speckit pour le #198 afin de rendre durables et fonctionnels les MP » — périmètre étendu par l'opérateur à tout l'épic #197.

## Contexte

Aujourd'hui, la clé privée qui déchiffre les messages n'existe **que** dans le
navigateur qui l'a créée : `useEncryptedChat` la range dans `localStorage`
(`libre_private_key`), chiffrée par une « clé d'appareil » rangée… dans le même
`localStorage` (`libre_device_key`). Cette enveloppe ne protège donc de rien
d'autre que d'un coup d'œil distrait, et surtout elle ne voyage pas.

Conséquence, vérifiable en trois clics : changer de téléphone, vider le cache,
ouvrir une fenêtre privée ou simplement changer de navigateur suffit à **perdre
définitivement l'intégralité de ses conversations**. Le code régénère une paire,
pousse la nouvelle clé publique sur `POST /api/users/keys` — qui fait un `upsert`
et **écrase** l'ancienne, sans en garder trace — et l'ancien fil devient un mur
de caractères illisibles. Le pair est touché lui aussi : ce qu'il avait chiffré
pour l'ancienne clé publique n'est plus déchiffrable par personne.

Le pire est le silence. Quand le déchiffrement échoue, le `catch` retombe en
« pas de chiffrement » et l'application continue comme si de rien n'était. La
personne ne sait pas qu'elle vient de perdre quelque chose, ni qu'il ne fallait
pas vider ce cache.

Sur une application dont la messagerie est l'aboutissement de tout le parcours —
on se croise, on s'aime bien, **on se parle** — c'est une perte de données
silencieuse au cœur du produit. Une conversation qui disparaît sans explication
ne coûte pas une fonctionnalité : elle coûte la confiance.

Trois lots pour en sortir : que la clé **survive** à l'appareil (#198), que le
fil **reste lisible** même après une rotation de clé (#199), et que ce qui est
conservé le soit pour une raison assumée et dicible (#202).

Hors périmètre, déjà livré : la pagination par curseur et le déchiffrement
paresseux (#200, PR #254), la virtualisation de la liste (PR #303).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Changer de téléphone sans rien perdre (Priority: P1)

Une personne change de téléphone, ou vide le cache de son navigateur, ou se
reconnecte depuis son ordinateur. Elle ouvre Messages : ses conversations sont
là, lisibles, exactement comme sur l'appareil précédent. Elle n'a rien eu à
sauvegarder, rien à copier, aucune phrase secrète à retrouver.

**Why this priority**: C'est le bloquant. Tout le reste de l'épic suppose une
clé qui survit. Sans ce récit, la messagerie perd ses données par conception, et
chaque nouvelle conversation est une perte future programmée.

**Independent Test**: Se connecter depuis un second navigateur (ou après avoir
vidé le stockage local), ouvrir une conversation existante : les messages
s'affichent en clair. Testable et démontrable seul, y compris pour un compte
Google/GitHub qui n'a pas de mot de passe.

**Acceptance Scenarios**:

1. **Given** un compte qui a déjà échangé des messages, **When** il se connecte
   depuis un appareil qui n'a jamais servi, **Then** l'intégralité de son
   historique s'affiche en clair, sans aucune action de sa part.
2. **Given** un compte créé via Google ou GitHub (donc sans mot de passe),
   **When** il se connecte depuis un second appareil, **Then** le résultat est
   identique : rien ne distingue son parcours de celui d'un compte à mot de passe.
3. **Given** une session ouverte, **When** la personne se déconnecte, **Then**
   la clé privée ne subsiste pas en clair sur l'appareil quitté.
4. **Given** une requête de restitution de clé sans session valide, **When**
   elle est reçue, **Then** elle est refusée ; une session valide ne restitue
   jamais que **sa propre** clé.
5. **Given** un message que l'application ne parvient pas à déchiffrer, **When**
   il s'affiche, **Then** il le dit explicitement à la personne au lieu de
   passer en clair silencieusement.

---

### User Story 2 - Les comptes déjà là ne perdent rien au passage (Priority: P2)

Les personnes qui utilisent déjà Libre détiennent leur clé sur leur appareil.
Au premier chargement après la mise en service, cette clé rejoint le coffre du
service sans qu'elles s'en aperçoivent. Leurs anciens fils continuent de
s'ouvrir, et deviennent du même coup portables.

**Why this priority**: US1 sans ce récit ne sert que les nouveaux comptes et
laisse les premiers utilisateurs — ceux qui ont fait confiance en premier —
avec le défaut d'origine. C'est P2 et non P1 parce que la sécurité du cas est
déjà portée par US1 (ne jamais régénérer une clé quand le compte en a une), mais
la migration effective est un livrable distinct.

**Independent Test**: Depuis un navigateur portant une clé locale d'avant la
mise en service, ouvrir l'application, puis se connecter ailleurs : les fils
d'avant s'ouvrent sur le nouvel appareil.

**Acceptance Scenarios**:

1. **Given** un compte dont la clé n'existe que localement, **When** il ouvre
   l'application après la mise en service, **Then** sa clé rejoint le coffre et
   ses conversations restent lisibles, sans écran ni question.
2. **Given** un compte dont la clé publique est connue du service mais dont
   aucune clé n'est encore au coffre, **When** il ouvre l'application depuis un
   appareil **qui ne détient pas** la clé correspondante, **Then** le système ne
   régénère **pas** de nouvelle paire : il signale que le fil est illisible
   depuis cet appareil et invite à revenir sur l'appareil d'origine.
3. **Given** la migration déjà faite, **When** la personne recharge, **Then**
   elle n'est pas rejouée.

---

### User Story 3 - Savoir ce que le service peut lire (Priority: P2)

Une personne curieuse — ou méfiante — ouvre la page Confidentialité et y trouve
une description exacte de ce qui se passe : ses messages sont chiffrés en
transit et au repos, et **le service détient de quoi les déchiffrer**. C'est dit
en français clair, sans jargon rassurant.

**Why this priority**: L'escrow échange délibérément le zéro-knowledge contre
une messagerie qui marche. Cet arbitrage n'est acceptable que s'il est **dit**.
La charte l'impose (principe III, corollaire acquis en #328 : une promesse
affichée doit être adossée au code, sinon c'est un défaut de sécurité). Livrer
US1 en laissant une page qui laisse croire au zéro-knowledge fabriquerait le
défaut que #328 a corrigé ailleurs.

**Independent Test**: Lire la page Confidentialité et confronter chaque phrase
au comportement réel du service. Aucune phrase ne doit promettre plus que ce que
le code garantit.

**Acceptance Scenarios**:

1. **Given** la page Confidentialité, **When** on la lit, **Then** elle indique
   sans ambiguïté que le service peut techniquement accéder au contenu des
   messages, et pour quelles raisons ce choix a été fait.
2. **Given** une phrase de l'interface qui décrit une garantie de
   confidentialité, **When** on cherche le code qui la tient, **Then** il existe
   et un test de non-régression le couvre.
3. **Given** un texte antérieur promettant un chiffrement « de bout en bout que
   personne ne peut lire », **When** la fonctionnalité est livrée, **Then** ce
   texte a disparu de l'interface, des CGU et de la documentation publique.

---

### User Story 4 - Un vieux fil reste lisible après une rotation de clé (Priority: P3)

Une clé change — compte compromis, réinitialisation, incident. Les conversations
d'avant continuent de s'ouvrir. La rotation protège la suite sans effacer le
passé.

**Why this priority**: Sans lui, il reste un chemin qui détruit l'historique, et
la promesse d'US1 tient par chance plutôt que par conception. Mais US1 supprime
déjà la cause quotidienne des rotations subies (changement d'appareil) : ce
récit traite le cas résiduel, d'où P3. Correspond à #199, aujourd'hui bloqué
par #198.

**Independent Test**: Provoquer une rotation de clé sur un compte, puis rouvrir
une conversation antérieure : elle est lisible, et les nouveaux messages
utilisent la nouvelle clé.

**Acceptance Scenarios**:

1. **Given** une conversation antérieure à une rotation, **When** on l'ouvre
   après la rotation, **Then** les anciens messages sont lisibles par les deux
   personnes.
2. **Given** une rotation de clé, **When** un message est envoyé ensuite,
   **Then** il est protégé par la nouvelle clé.
3. **Given** une clé publique remplacée, **When** on consulte l'historique des
   clés du compte, **Then** l'ancienne est conservée et datée, jamais écrasée.

---

### User Story 5 - Effacer pour de bon (Priority: P3)

Une personne veut qu'un message cesse d'exister. Elle l'efface : il disparaît
des deux côtés, ne laissant qu'une trace neutre « message supprimé ». Et quand
un match se rompt, la conversation part avec lui — pour de bon, pas seulement à
l'écran.

**Why this priority**: C'est la contrepartie directe de l'escrow : si le service
peut techniquement lire, alors le droit d'effacer doit être réel, et « effacer »
doit vouloir dire effacé jusque dans les données. P3 parce que le geste existe
déjà à l'écran (`deletedAt` produit une pierre tombale) : ce qui manque est la
purge effective derrière, pas l'interface. Correspond à #202.

**Independent Test**: Effacer un message, recharger des deux côtés, vérifier la
pierre tombale ; rompre un match de test, vérifier que le fil n'est restituable
par aucun chemin.

**Acceptance Scenarios**:

1. **Given** un message effacé par son auteur, **When** le pair recharge,
   **Then** il voit une trace neutre « message supprimé » et le contenu n'est
   plus restituable, ni à l'écran ni par la réponse réseau.
2. **Given** un match rompu, **When** la purge passe, **Then** la conversation
   et ses messages ne sont plus restituables par aucun chemin, y compris par
   l'administration.
3. **Given** un compte supprimé, **When** on interroge l'export RGPD ou
   l'administration, **Then** ni ses messages ni sa clé au coffre ne subsistent.

---

### Edge Cases

- **Coffre indisponible** (panne du service de clés) : l'application NE DOIT PAS
  régénérer une paire pour « débloquer » la situation — ce serait détruire
  l'historique pour éviter un message d'erreur. Elle affiche un état dégradé
  explicite et réessaie.
- **Clé maître perdue ou remplacée** côté service : les messages deviennent
  irrécupérables pour tout le monde. Ce risque est central et exige une
  procédure de gestion de la clé maître écrite avant la mise en service.
- **Personne présente sur deux appareils en même temps** : les deux sessions
  partagent la même clé d'identité ; aucune ne doit invalider l'autre.
- **Compte supprimé** : `DELETE /api/users/me` détruit le compte en cascade.
  La clé au coffre doit disparaître avec, et le fil devenir illisible plutôt que
  de subsister en clair côté pair.
- **Message reçu pendant que la clé change** : il ne doit être ni perdu ni
  définitivement illisible ; l'ordre des opérations doit garantir qu'une clé
  n'est publiée qu'une fois utilisable.
- **Fenêtre privée** : la clé restituée vit en mémoire de session et disparaît à
  la fermeture — c'est le comportement attendu, pas un défaut.
- **Export RGPD** (`/api/users/me/export`) : les messages doivent en sortir
  lisibles, sinon l'export est une coquille vide. C'est une conséquence directe
  de l'escrow, à assumer explicitement.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système DOIT permettre à une personne de lire l'intégralité de
  ses conversations depuis n'importe quel appareil où sa session est valide,
  **sans aucune action de sauvegarde ou de restauration de sa part**.
- **FR-002**: La restitution de la clé DOIT exiger une session authentifiée et
  ne DOIT jamais restituer que la clé du compte de cette session.
- **FR-003**: Le système NE DOIT JAMAIS conserver la clé privée en clair dans sa
  base de données, ni exposer la clé maître au navigateur.
- **FR-004**: Le parcours DOIT être identique pour les comptes à mot de passe et
  pour les comptes créés via un fournisseur externe (aucun de ces derniers n'a de
  mot de passe à dériver).
- **FR-005**: Le système NE DOIT JAMAIS régénérer une paire de clés pour un
  compte qui en possède déjà une. En cas d'impossibilité de récupérer la clé
  existante, il DOIT échouer visiblement plutôt que d'écraser.
- **FR-006**: Un échec de déchiffrement DOIT être **visible pour la personne**
  (message inintelligible signalé comme tel, avec ce qu'elle peut faire), et
  NE DOIT PAS être avalé par un repli silencieux en clair.
- **FR-007**: Les comptes existants dont la clé n'est que locale DOIVENT la
  verser au coffre au premier chargement suivant la mise en service, sans écran
  d'accueil, sans question, et **sans perdre un seul fil**.
- **FR-008**: Le remplacement d'une clé publique NE DOIT PAS écraser la
  précédente : l'historique des clés est conservé et daté, afin qu'un message
  ancien reste rattachable à la clé qui l'a protégé.
- **FR-009**: Après une rotation de clé, les messages antérieurs DOIVENT rester
  lisibles par les deux personnes de la conversation.
- **FR-010**: Les pages Confidentialité et CGU DOIVENT décrire la posture réelle
  — chiffrement en transit et au repos, **accès techniquement possible par le
  service** — en français clair, et aucune formulation de l'interface NE DOIT
  promettre davantage.
- **FR-011**: Toute promesse de confidentialité affichée DOIT être adossée à un
  test de non-régression sur la route qui la tient (corollaire #328).
- **FR-012**: Les personnes DOIVENT pouvoir effacer un message ou une
  conversation, avec un effet défini et tenu jusque dans les données du service.
- **FR-013**: Les messages DOIVENT être conservés **tant que le match qui les
  porte existe**. Aucune échéance de temps : rien ne disparaît par simple
  ancienneté. La rupture du match et la suppression du compte DOIVENT en
  revanche déclencher une purge effective, pas un simple masquage.
- **FR-014**: L'effacement d'un message par son auteur DOIT valoir **pour les
  deux personnes** et laisser une trace neutre (« message supprimé ») : le pair
  sait qu'il y avait quelque chose, sans pouvoir savoir quoi. Le contenu effacé
  NE DOIT plus figurer dans aucune réponse d'API. Sa destruction en base
  intervient après une **fenêtre de conservation pour la modération** — le code
  actuel garde délibérément le chiffré pour cet usage (#201), et l'escrow le rend
  désormais lisible par le service : la durée de cette fenêtre reste à trancher
  au moment du lot correspondant (cf. [plan.md](./plan.md), § Risques).
- **FR-015**: La conservation annoncée DOIT être dicible en une phrase dans les
  pages Confidentialité et FAQ : « tes messages vivent aussi longtemps que la
  conversation ; quand elle s'arrête, ils s'effacent ». Les **fils éphémères
  sont hors périmètre** de cette itération et restent une piste ouverte dans
  #202, sans code à ce stade.
- **FR-016**: L'accès administratif au contenu des messages, s'il existe, DOIT
  être journalisé comme l'est déjà l'accès aux photos privées.
- **FR-017**: Aucune écriture déjà actée NE DOIT être annulée par un effet de
  bord ultérieur (notification, temps réel) ; ces effets restent en best-effort.

### Key Entities

- **Clé d'identité d'un compte** : aujourd'hui `UserKey` ne porte que la clé
  publique et sa date, en un seul exemplaire par compte (`upsert` = écrasement).
  Cette feature lui ajoute la garde du secret correspondant, sous enveloppe, et
  la notion d'historique — c'est le changement structurant.
- **Coffre (escrow)** : l'enveloppe qui protège la clé privée au repos, ouverte
  uniquement côté service, jamais transmise au navigateur.
- **Clé de conversation** : la matière qui protège un fil donné, rattachée à une
  génération de clé plutôt qu'à l'appareil courant. C'est elle qui permet à un
  vieux message de rester lisible après rotation.
- **Message** : porte déjà `deletedAt` (pierre tombale) et `readAt`. La rétention
  y ajoute la notion d'échéance et de purge effective.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zéro conversation perdue lors d'un changement d'appareil : sur un
  compte de test à mot de passe **et** un compte via fournisseur externe, 100 %
  des messages antérieurs restent lisibles depuis un appareil neuf.
- **SC-002**: Aucune action utilisateur n'est nécessaire pour retrouver ses
  messages — zéro écran supplémentaire, zéro phrase secrète, zéro export à
  conserver.
- **SC-003**: Aucun compte existant ne perd de fil à la mise en service, vérifié
  avant/après sur un échantillon représentatif des comptes en production.
- **SC-004**: Un message illisible est signalé comme tel dans 100 % des cas :
  plus aucun repli silencieux en clair.
- **SC-005**: Chaque phrase de l'interface décrivant la confidentialité des
  messages correspond au comportement observable, et une relecture croisée
  copie ↔ code ne trouve aucun écart.
- **SC-006**: Une rotation de clé ne rend illisible aucun message antérieur.
- **SC-007**: Ce qu'une personne efface n'est restituable par aucun chemin
  après la purge — ni par l'interface, ni par l'export, ni par l'administration.

## Assumptions

- La décision d'architecture est **acquise et non rouverte** : escrow serveur
  assumé, au prix du zéro-knowledge, arbitrage tranché par l'opérateur le
  2026-07-08 dans #198. L'alternative « clé dérivée du mot de passe » est écartée
  (inapplicable aux comptes sans mot de passe, et exigerait de manipuler le mot
  de passe en clair au login).
- Le volume actuel — premiers comptes en production — permet une migration en
  une seule passe, sans fenêtre de maintenance ni traitement par lots.
- Le modèle de session existant (NextAuth, JWT) est réutilisé tel quel ; cette
  feature n'introduit pas de nouveau facteur d'authentification.
- La confiance dans l'hébergeur de la base est déjà un prérequis du produit :
  l'escrow déplace le curseur, il ne franchit pas une frontière que le reste de
  l'application respecterait aujourd'hui.
- La gestion de la clé maître (génération, stockage, rotation, sauvegarde) est
  un prérequis d'exploitation, à écrire au moment du plan.

## Dépendances

- **#198** — escrow de clé : socle d'US1, US2, US3.
- **#199** — clé de conversation et historique de clés : socle d'US4, bloqué
  par #198.
- **#202** — rétention et messages éphémères : socle d'US5, `needs-design`.
- **#200 / PR #254 / PR #303** — pagination par curseur, déchiffrement paresseux
  et virtualisation : **déjà livrés**, à ne pas re-spécifier. Le déchiffrement
  paresseux suppose une clé disponible : il devient fiable avec US1.
- **#328** — patron « une promesse affichée est adossée à du code et testée par
  route » : modèle direct de FR-010 et FR-011.
- **#160** — suppression de compte : la clé au coffre doit être détruite avec le
  compte.

## Décisions tranchées *(clarification du 2026-08-17)*

Ces trois questions portaient toutes sur le lot rétention (#202), seul lot non
tranché produit. US1 à US4 étaient spécifiés sans ambiguïté dès l'écriture.

| # | Question | Décision | Ce qu'on écarte et pourquoi |
|---|---|---|---|
| 1 | Durée de conservation par défaut | **Indéfinie tant que le match vit** ; purge à la rupture du match et à la suppression du compte | Une purge après N mois efface des souvenirs que personne n'a demandé d'effacer, et oblige à prévenir avant. Un réglage par personne crée une asymétrie insoluble dans un fil à deux (qui gagne, le plus court ?) pour un besoin que rien n'atteste encore. |
| 2 | « Effacer » : pour soi ou pour les deux ? | **Pour les deux**, avec pierre tombale « message supprimé » | L'effacement local seul laisse un message regretté chez le pair pour toujours — l'inverse du service rendu. Le double chemin (« pour moi » / « pour tout le monde ») ajoute un état, une boîte de dialogue et de la copie pour un gain marginal. C'est aussi ce que fait déjà `Message.deletedAt` : le confirmer évite de réécrire l'existant. |
| 3 | Fils éphémères | **Hors périmètre** de cette itération ; la piste reste ouverte dans #202 | Bâtir l'éphémère maintenant, c'est trancher à l'aveugle l'accord unilatéral ou bilatéral, la rétroactivité et l'affichage du compte à rebours — pour un mécanisme dont aucun usage observé ne réclame l'existence. Le bloquant est ailleurs. |

**Conséquence pour la suite** : US5 se limite désormais à rendre l'effacement et
la purge **réels** (le geste existe déjà à l'écran), sans nouvelle surface
d'interface. La purge à la rupture du match s'appuie sur la cascade existante ;
l'action « rompre un match » elle-même relève de #161, hors périmètre ici.
