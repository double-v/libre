# Feature Specification: Questions de profil en miroir

**Feature Branch**: `feat/009-questions-miroir`

**Created**: 2026-09-25

**Status**: Draft

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
- Q: Nombre de réponses par profil ? → A: 5 au plus.
- Q: Gestion de la banque ? → A: fixée dans le code, modifiée par PR.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Répondre à des questions sur son profil (Priority: P1)

Depuis son profil, une membre choisit une question dans la banque, écrit sa
réponse, l'enregistre ; elle peut en avoir plusieurs, les modifier, les
retirer. Ses réponses apparaissent sur sa fiche.

**Why this priority**: sans réponses, rien à lire ni à dévoiler. C'est le socle.

**Independent Test**: une membre ajoute, modifie et retire une réponse depuis
son profil ; sa propre fiche les affiche.

**Acceptance Scenarios**:

1. **Given** le profil d'une membre, **When** elle choisit une question et
   enregistre une réponse valide, **Then** la réponse apparaît dans son profil.
2. **Given** une réponse contenant une adresse e-mail, un `@`, un lien ou un
   numéro, **When** elle l'enregistre, **Then** l'enregistrement est refusé
   avec un message qui énonce la règle sans accuser.
3. **Given** une membre qui a déjà atteint le nombre maximal de réponses,
   **When** elle veut en ajouter une, **Then** on lui propose d'en remplacer
   une plutôt que de refuser sèchement.
4. **Given** une réponse existante, **When** elle la retire, **Then** elle
   disparaît de sa fiche et du profil.

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
  pas ressembler à un mur de refus (FR-008).
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
  légères, sans thème sensible (santé, politique, religion, sexualité, argent,
  corps). La banque est **fixée dans le code** et versionnée : ajouter,
  reformuler ou retirer une question passe par une PR.
- **FR-002**: Un membre MUST pouvoir répondre à **5 questions au plus**,
  une réponse par question, de 1 à 300 caractères après normalisation.
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
  doit ressembler à un mur de refus. Si la lectrice a déjà 5 réponses, la
  saisie en place propose d'en remplacer une.
- **FR-009**: Les réponses d'un profil signalé MUST être visibles de l'admin
  dans le signalement ; l'admin MUST pouvoir retirer une réponse, action
  journalisée, avec une mention sobre chez l'autrice.
- **FR-010**: Aucune fonctionnalité MUST NOT devenir inaccessible faute de
  réponse : répondre reste facultatif.
- **FR-011**: Les copies MUST être en français, au tutoiement, sans chiffre de
  compte ni comparaison aux autres membres.
- **FR-012**: La règle MUST être couverte par un test de non-fuite **par
  route** qui expose les réponses (principe III, corollaire #328).
- **FR-013**: Les réponses MUST être incluses dans l'export des données
  personnelles et supprimées avec le compte.

### Key Entities

- **Question** : intitulé, état (proposée / retirée), ordre d'affichage.
- **Réponse** : autrice, question, texte (1–300), dates de création et de
  modification, état (publiée / retirée par la modération).
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

## Assumptions

- La banque démarre avec 15 à 25 questions, proposées au plan dans le ton de
  `PRODUCT.md` et validées par l'opérateur.
- Les réponses s'affichent sur la fiche (modale profil) ; les cartes de
  Découvrir n'en montrent pas.
- Pas de réponses aux réponses, pas de réactions : l'accroche passe par le
  premier message, qui existe déjà.
- La détection de contact de #459 est extraite pour être partagée (pseudo,
  réponses, et #443 plus tard), pas dupliquée.
- La spec 008 étant en production depuis le 2026-09-25, SC-002 se lit sur la
  même fenêtre que ses propres indicateurs.
