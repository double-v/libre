# Feature Specification: Questions de profil en miroir

**Feature Branch**: `feat/009-questions-miroir`

**Created**: 2026-09-25

**Status**: Draft

**Issues** : #461 (US1), #462 (US2), #463 (US3), #465 (US4)

**Mise en ligne** : 2026-09-25 (PR #466, déploiement vérifié en production). Annoncée au journal le même jour (« Des questions pour se découvrir »). Lecture de SC-002, SC-003 et SC-006 à J+30, le 2026-10-25, sur le bloc « answers » des statistiques admin. La spec 008 étant en ligne depuis le même jour, les deux effets se lisent sur la même fenêtre.

**Input**: User description: "Spec 009 — questions de profil en miroir (#5 du brainstorm réciprocité du 2026-09-25) : une banque de questions ouvertes ; la réponse d'une personne reste voilée tant que tu n'as pas répondu à la même question. Enrichit les profils sans rien demander de sensible et donne des points d'accroche pour le premier message."

## Contexte

Le brainstorm du 2026-09-25 a retenu trois règles de réciprocité miroir. Les
deux premières (intention, distance) sont en production depuis la spec 008.
Celle-ci est la troisième, et la seule qui **enrichit** vraiment les profils :
aujourd'hui un profil ne porte que photos, bio libre (≤ 500 caractères),
centres d'intérêt, genre, orientation, pratiques et intention. Rien ne donne
un point d'accroche concret pour écrire un premier message.

Principe : des **questions ouvertes, légères**, dans une banque fixée par
Libre (« Un dimanche idéal ? », « Ce qui te fait rire ? »). Un membre en
choisit et y répond. **Tu lis la réponse d'une personne à une question une
fois que tu y as répondu toi-même.**

Ce qui existe et se réutilise :
- La décision miroir unique côté serveur (`intentionFor`, spec 008) : même
  famille de règle, appliquée à la sérialisation.
- La détection de contact de la règle du pseudo (#459) : e-mail, `@`, lien,
  numéro — une réponse ne doit pas en porter plus qu'un pseudo (cas des faux
  profils, spec 006).
- Le signalement d'un membre et la modération admin (#321/#322).

## Clarifications

### Session 2026-09-25

- Q: Granularité du miroir ? → A: question par question, avec invitation en place (saisie directement dans la fiche).
- Q: Nombre de réponses par profil ? → A: 5 au plus. **Révisé le même jour** (retour d'une bêta-testeuse, souvenir d'OkCupid : l'envie de répondre à beaucoup de questions) → **sans limite** ; une réponse par question, donc borné par la banque.
- Q: Gestion de la banque ? → A: fixée dans le code, modifiée par PR.
- Q: Taille de la banque ? → A: **grande** (80 à 150 questions), classée par thèmes, avec un mode « Répondre à la suite ».
- Q: Substances (alcool, tabac, CBD…) ? → A: une **question ouverte en texte libre**. Les exemples légaux figurent seulement comme aide à la saisie ; on n'incite à rien, chacun livre ce qu'il veut de ses habitudes. Pas de choix fermés, donc pas de filtre.
- Q: Opinion politique et questions filtrables ? → A: **hors 009** : spec 010 (questions à choix, filtres, cadre RGPD art. 9).
- Q: Choix unique ou multiple ? → A: les deux, selon la question (exemple de l'opérateur : « Un jeu qui te plaît » appelle plusieurs réponses) ; annoncé en toutes lettres à l'écran ; options exclusives possibles (« Aucun des quatre »).
- Q: Comment aider les personnes timides, réservées ou pudiques, et éviter la page blanche, sans brider les plus expressives ? → A: **trois formats** : *choix + précision facultative* (pastilles, puis « Tu veux préciser ? »), *ouverte* (texte libre avec aide), et une série ludique **« Ceci ou cela »** (choix binaires, rien à écrire). Les choix de la 009 servent à répondre, **pas à filtrer** (la 010 décidera lesquels deviennent des critères).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Répondre à des questions sur son profil (Priority: P1)

Depuis son profil, une membre parcourt la banque par thèmes, ou se laisse
proposer les questions une à une (« Répondre à la suite », avec « Passer »).
Selon la question, elle **touche une pastille** (et peut préciser par écrit),
ou **écrit** librement. Elle modifie et retire ses réponses. Autant qu'elle
veut : une réponse par question. Ses réponses apparaissent sur sa fiche.

**Why this priority**: sans réponses, rien à lire ni à dévoiler. C'est le socle.

**Independent Test**: une membre ajoute, modifie et retire une réponse depuis
son profil ; sa propre fiche les affiche.

**Acceptance Scenarios**:

1. **Given** le profil d'une membre, **When** elle choisit une question et
   enregistre une réponse valide, **Then** la réponse apparaît dans son profil.
2. **Given** une réponse contenant une adresse e-mail, un `@`, un lien ou un
   numéro, **When** elle l'enregistre, **Then** l'enregistrement est refusé
   avec un message qui énonce la règle sans accuser.
3. **Given** le mode « Répondre à la suite », **When** elle enregistre ou
   passe une question, **Then** la suivante sans réponse s'affiche ; elle en
   sort quand elle veut, sans message qui la retienne.
4. **Given** une réponse existante, **When** elle la retire, **Then** elle
   disparaît de sa fiche et du profil.
5. **Given** une question à choix, **When** elle touche une pastille sans rien
   écrire, **Then** c'est une réponse complète ; **When** elle ajoute une
   précision, **Then** la précision s'affiche sous le choix.

---

### User Story 4 - « Ceci ou cela » : répondre en jouant (Priority: P2)

Une membre qui ne sait pas quoi écrire lance « Ceci ou cela » : deux options
à la fois (« Mer ou montagne ? »), elle en touche une ou passe, la suivante
arrive. Rien à écrire. Ses choix s'affichent sur sa fiche, en ligne compacte.

**Why this priority**: l'entrée la plus douce pour les personnes réservées ;
elle nourrit le miroir sans demander de se livrer.

**Independent Test**: enchaîner dix paires en moins d'une minute ; la fiche
les montre ; une lectrice n'en lit que celles auxquelles elle a répondu.

**Acceptance Scenarios**:

1. **Given** le mode « Ceci ou cela », **When** elle touche une option,
   **Then** le choix est enregistré et la paire suivante sans réponse s'affiche.
2. **Given** une paire, **When** elle passe, **Then** rien n'est enregistré.
3. **Given** la fiche d'une autre personne, **When** la lectrice a répondu à
   la même paire, **Then** elle voit le choix de l'autre ; sinon la paire est
   voilée, comme toute question (FR-004).

---

### User Story 2 - Lire une réponse une fois qu'on a répondu à la même question (Priority: P1)

Sur la fiche d'une autre personne, chaque question à laquelle elle a répondu
est visible. La réponse s'affiche si la lectrice a répondu à la même
question ; sinon, elle est voilée et une invitation propose d'y répondre.

**Why this priority**: c'est la réciprocité elle-même, et le levier qui donne
envie de répondre.

**Independent Test**: deux comptes ; A a répondu à Q1 et Q2, B seulement à Q1.
B lit la réponse de A à Q1 ; la réponse de A à Q2 est voilée pour B, jamais
envoyée par le service ; après que B a répondu à Q2, elle la lit.

**Acceptance Scenarios**:

1. **Given** une lectrice qui a répondu à Q, **When** elle ouvre une fiche qui
   a répondu à Q, **Then** elle lit la réponse.
2. **Given** une lectrice qui n'a pas répondu à Q, **When** elle ouvre la
   fiche, **Then** elle voit l'intitulé de Q, pas la réponse, et une invitation
   à répondre ; la réponse n'est dans aucune réponse du service.
3. **Given** la lectrice suit l'invitation et répond à Q dans la fiche,
   **When** elle enregistre, **Then** elle lit la réponse de l'autre à Q sans
   quitter la fiche.
4. **Given** sa propre fiche, **Then** rien n'est jamais voilé.
5. **Given** une lectrice qui retire sa réponse à Q, **Then** la réponse de
   l'autre à Q redevient voilée.

---

### User Story 3 - Modérer les réponses (Priority: P2)

Une réponse est du texte libre visible par d'autres : elle doit pouvoir être
signalée par un membre et retirée par un admin.

**Why this priority**: indispensable avant d'ouvrir largement, mais après le
socle ; le filtre de contact à l'écriture couvre le premier risque.

**Independent Test**: un membre signale un profil en citant une réponse ;
l'admin voit les réponses du profil signalé et en retire une ; le membre
concerné voit qu'elle a été retirée.

**Acceptance Scenarios**:

1. **Given** une fiche, **When** un membre signale le profil, **Then** l'admin
   voit, dans le signalement, les réponses du profil au moment du signalement.
2. **Given** une réponse jugée inappropriée, **When** l'admin la retire,
   **Then** elle disparaît de la fiche, l'action est journalisée, et son autrice
   voit dans son profil que la réponse a été retirée (sans détail accusateur).

---

### Edge Cases

- **Aucune question commune** : si la lectrice n'a répondu à aucune des
  questions de la fiche, toutes les réponses sont voilées ; la fiche ne doit
  pas ressembler à un mur de refus (FR-008) : quelques invitations, le reste
  replié.
- **Beaucoup de réponses** : une fiche peut porter des dizaines de réponses ;
  elle montre d'abord les questions en commun, puis replie le reste.
- **Réponse sur les substances qui évoque un produit illégal** : Libre ne la
  sollicite pas (aide à la saisie limitée aux exemples légaux) ; elle suit la
  modération ordinaire sur signalement, et les CGU interdisent d'y promouvoir
  ou d'y proposer des produits illicites.
- **Question retirée de la banque** : les réponses existantes restent
  affichées, la question n'est plus proposée aux nouvelles réponses.
- **Réponse vide ou seulement des espaces** : refusée comme une absence.
- **Fiche d'une personne sans aucune réponse** : aucune section, aucune
  invitation.
- **Échec de lecture des réponses de la lectrice** : tout est voilé (fermé par
  défaut, principe III).
- **Mode invisible, blocage, bannissement** : aucune règle nouvelle ; la fiche
  suit les règles d'accès existantes.
- **Réponse modifiée après lecture** : la lectrice lit toujours la version
  courante ; aucun historique exposé.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système MUST proposer une banque de questions ouvertes,
  légères, classées par **thèmes**, sans thème sensible (santé, politique,
  religion, sexualité, argent, corps) — à l'exception d'une question sur les
  **habitudes** (alcool, tabac, CBD…) en texte libre, dont l'aide à la saisie
  ne cite que des produits légaux et n'incite à rien. La banque est **fixée
  dans le code** et versionnée : ajouter, reformuler ou retirer une question
  passe par une PR. Elle compte 80 à 150 questions au lancement.
- **FR-002**: Un membre MUST pouvoir répondre à **autant de questions qu'il
  veut**, une réponse par question, de 1 à 300 caractères après
  normalisation. Le profil propose un parcours par thèmes et un mode
  « Répondre à la suite » (question suivante sans réponse, « Passer »
  toujours disponible).
- **FR-002b**: Chaque question a un **format** : *ouverte* (texte 1–300),
  *choix* (pastilles parmi 2 à 5 options, plus une précision facultative de 0
  à 300 caractères), ou *ceci-ou-cela* (une option parmi deux, sans texte). Une
  question à choix est **à choix unique** ou **à choix multiple** ; l'écran
  l'annonce en toutes lettres (« Choisis une réponse. » / « Tu peux choisir
  plusieurs réponses. »). En choix multiple, une option peut être
  **exclusive** (« Aucun des quatre ») : la choisir retire les autres. Une
  réponse à choix sans précision est complète. Les choix doivent appartenir
  aux options de la question, sans doublon, au moins un.
- **FR-002c**: Un mode **« Ceci ou cela »** MUST enchaîner les paires sans
  réponse, un toucher par paire, « Passer » toujours disponible, sortie libre,
  sans compteur ni série.
- **FR-003**: Une réponse MUST être refusée si elle contient un moyen de
  contact (même détection que le pseudo, #459 : e-mail, `@`, lien ou domaine,
  numéro), avec un message qui énonce la règle.
- **FR-004**: Le service MUST n'envoyer à une lectrice la réponse d'autrui à
  une question que si elle a elle-même une réponse à cette question ; sinon
  l'intitulé et un marqueur « voilé » seulement. Décision unique côté serveur,
  appliquée à la sérialisation de chaque route qui expose les réponses.
- **FR-005**: Sa propre fiche et son propre profil MUST montrer toutes ses
  réponses.
- **FR-006**: Une réponse voilée MUST s'accompagner d'une invitation à répondre
  à la même question, saisie en place dans la fiche (FR-008).
- **FR-007**: L'état voilé MUST être recalculé à chaque lecture (jamais
  stocké) : répondre lève le voile, retirer sa réponse le repose.
- **FR-008**: Le miroir est **question par question**, et l'invitation se
  fait **en place** : sous l'intitulé voilé, « Réponds aussi pour lire la
  sienne » ouvre la saisie de cette question directement dans la fiche ; une
  fois enregistrée, la réponse de l'autre s'affiche sans quitter la fiche.
  Voilée ou non, une question garde la même densité douce : aucune fiche ne
  doit ressembler à un mur de refus. Ordre sur la fiche : d'abord les
  questions **en commun** (lisibles), puis quelques invitations, puis
  « Voir toutes ses réponses » qui déplie le reste — sans aucun nombre.
- **FR-009**: Les réponses d'un profil signalé MUST être visibles de l'admin
  dans le signalement ; l'admin MUST pouvoir retirer une réponse, action
  journalisée, avec une mention sobre chez l'autrice.
- **FR-010**: Aucune fonctionnalité MUST NOT devenir inaccessible faute de
  réponse : répondre reste facultatif.
- **FR-011**: Les copies MUST être en français, au tutoiement, sans chiffre de
  compte ni comparaison aux autres membres, et rédigées en **phrases
  complètes**, compréhensibles par des membres de 18 à 79 ans : pas de style
  télégraphique (« Deux options, un toucher »), pas de verbe réservé au
  tactile (« touche » → « choisis »), des boutons qui disent l'action entière
  (« Passer cette question », « Arrêter pour le moment »). Retour opérateur
  du 2026-09-25.
- **FR-012**: La règle MUST être couverte par un test de non-fuite **par
  route** qui expose les réponses (principe III, corollaire #328).
- **FR-013**: Les réponses MUST être incluses dans l'export des données
  personnelles et supprimées avec le compte.

### Key Entities

- **Question** : clé stable, thème, format (ouverte / choix / ceci-ou-cela),
  choix unique ou multiple, options (pour les formats à choix, dont
  d'éventuelles options exclusives), intitulé, aide à la saisie facultative,
  état (proposée / retirée), ordre d'affichage.
- **Réponse** : autrice, question, choix (liste de clés d'options, vide pour
  une ouverte, un seul pour un choix unique ou un ceci-ou-cela), texte
  (facultatif selon le format, 0–300), dates de création et de modification,
  état (publiée / retirée par la modération). Au moins un choix ou un texte.
- **État de lecture d'une réponse** : dérivé pour un couple (lectrice,
  réponse) — visible, voilée pour la lectrice. Jamais stocké.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0 réponse d'autrui envoyée à une lectrice qui n'a pas répondu à
  la même question, vérifié sur chaque route qui expose les réponses.
- **SC-002**: Dans les 30 jours suivant la mise en ligne, au moins 30 % des
  profils actifs ont au moins une réponse.
- **SC-003**: Parmi les conversations ouvertes dans ces 30 jours, la part dont
  le premier message suit la lecture d'une réponse sur la fiche augmente
  (mesure à définir au plan, sans lire le contenu des messages chiffrés).
- **SC-004**: Aucun contact externe publié dans une réponse (0 réponse publiée
  portant un e-mail, `@`, lien ou numéro).
- **SC-005**: Temps médian pour écrire une première réponse : moins d'une
  minute depuis l'invitation.
- **SC-006**: Parmi les profils avec au moins une réponse, une part notable
  n'a répondu **que** par des choix (pastilles ou « Ceci ou cela ») : signe
  que les formats ludiques atteignent les personnes qui n'auraient rien écrit.

## Assumptions

- La banque démarre avec 80 à 150 questions par thèmes, proposées au plan dans
  le ton de `PRODUCT.md` et validées par l'opérateur.
- Les réponses en texte libre ne sont pas filtrables : une recherche du type
  « quelqu'un qui consomme du CBD » relève de la spec 010 si l'opérateur y
  ajoute un jour une question à choix sur ce sujet.
- Les réponses s'affichent sur la fiche (modale profil) ; les cartes de
  Découvrir n'en montrent pas.
- Pas de réponses aux réponses, pas de réactions : l'accroche passe par le
  premier message, qui existe déjà.
- La détection de contact de #459 est extraite pour être partagée (pseudo,
  réponses, et #443 plus tard), pas dupliquée.
- La spec 008 étant en production depuis le 2026-09-25, SC-002 se lit sur la
  même fenêtre que ses propres indicateurs.
