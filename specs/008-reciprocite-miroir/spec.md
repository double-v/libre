# Feature Specification: Réciprocité miroir — intention et distance

**Feature Branch**: `feat/008-reciprocite-miroir`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "Réciprocité miroir sur l'intention et la distance. Principe : « tu vois ce que tu montres », pour donner envie de compléter son profil sans rien bloquer ni punir. Règle A — « Ce que je cherche » en miroir. Règle B — Distance en miroir. Hors périmètre : questions de profil en miroir (spec suivante), photos, présence, accusés de lecture."

## Contexte

Le parcours d'accueil (spec 005) accompagne trois gestes (photo, ce que je
cherche, où), chacun passable. Passer une étape ne coûte aujourd'hui rien de
perceptible : la membre qui n'a pas dit ce qu'elle cherche lit quand même
l'intention de tout le monde, et celle qui n'a pas donné de position voit
simplement… rien à la place des distances, sans savoir pourquoi.

Cette spec retient deux règles d'une séance de brainstorm sur la réciprocité
entre membres (2026-09-25), choisies parce qu'elles sont **symétriques par
nature** et ne demandent rien de sensible :

- **A — l'intention en miroir** : tu vois ce que les autres cherchent une fois
  que tu as dit ce que tu cherches. Réciprocité d'honnêteté : c'est le champ
  qui évite les malentendus.
- **B — la distance en miroir** : c'est déjà vrai de fait (sans position, aucune
  distance ne peut être calculée) ; il manque seulement de le dire.

Écartées pendant le brainstorm, et pourquoi : photo contre photo imposée par la
plateforme (punit les personnes qui ont une raison légitime de rester
discrètes), « qui a vu mon profil » (appât des anti-références). Les questions
de profil en miroir feront l'objet d'une spec séparée (009).

État du code relevé le 2026-09-25 :

| Surface | Montre l'intention d'autrui ? | Montre une distance ? |
|---|---|---|
| Fiche / modale profil | oui | oui si position des deux côtés |
| Cartes « Pour toi » | non | tranche large si position des deux côtés, sinon rien |
| « À proximité » | oui | km, et un état vide dédié si pas de position |
| Croisements en chemin | oui | — |
| Filtres de Découvrir | filtre par intention disponible pour toutes | filtre de distance |

Valeurs d'intention existantes : libre, poly, casual, sérieux, autre.

## Clarifications

### Session 2026-09-25

- Q: Forme de la réponse d'indécision — nouvelle valeur ou « autre » élargi ? → A: nouvelle valeur dédiée, libellée « Je verrai en chemin » (ton de la marque, rappelle « Croisements en chemin ») ; « autre » garde son sens.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - L'intention des autres se lit une fois la sienne dite (Priority: P1)

Une membre qui n'a pas encore dit ce qu'elle cherche ouvre la fiche d'une autre
personne. À la place de l'intention de cette personne, elle lit une invitation
douce (« Dis ce que tu cherches pour lire ce que cherchent les autres ») qui
l'emmène vers le choix de sa propre intention. Dès qu'elle l'a déclarée, les
intentions des autres lui apparaissent à son retour.

**Why this priority**: c'est le cœur de la réciprocité, et c'est le champ qui
conditionne la qualité des premiers échanges (principe I : l'humain d'abord).

**Independent Test**: avec deux comptes, l'un sans intention, l'autre avec :
le premier ne reçoit l'intention du second dans **aucune** réponse du service
(fiche, À proximité, Croisements) et voit l'invitation ; après déclaration, il
la reçoit partout.

**Acceptance Scenarios**:

1. **Given** une membre sans intention déclarée, **When** elle ouvre la fiche
   d'une personne qui en a une, **Then** l'intention n'apparaît pas, l'invitation
   apparaît à sa place, et la réponse du service ne contient pas la valeur.
2. **Given** la même membre, **When** elle suit l'invitation et déclare une
   intention, **Then** elle revient sur la fiche et lit l'intention de l'autre.
3. **Given** une membre sans intention, **When** elle consulte son propre
   profil, **Then** rien n'est voilé pour elle.
4. **Given** une membre sans intention, **When** elle ouvre la fiche d'une
   personne qui n'a pas d'intention non plus, **Then** aucune invitation
   n'apparaît (il n'y a rien à dévoiler).
5. **Given** une membre sans intention, **When** elle ouvre les filtres de
   Découvrir, **Then** le filtre par intention n'est pas utilisable et porte la
   même invitation ; une requête qui le fournirait quand même est traitée comme
   sans filtre d'intention.

---

### User Story 2 - « Je verrai en chemin » compte comme une réponse (Priority: P1)

Une membre qui ne sait pas ce qu'elle cherche peut le dire, au même endroit et
du même geste que les autres choix. Cette réponse lève le voile exactement
comme une autre : on ne force aucune étiquette pour accéder à celle des autres.

**Why this priority**: sans elle, l'US1 devient une pression à se ranger dans
une case, contraire à l'inclusion silencieuse (principes I et II). Elle doit
donc être livrée avec ou avant l'US1.

**Independent Test**: choisir la réponse d'indécision dans le parcours d'accueil
puis dans le profil ; vérifier que les intentions des autres deviennent lisibles
et que cette réponse s'affiche chez les autres comme n'importe quelle intention.

**Acceptance Scenarios**:

1. **Given** l'étape « ce que je cherche » du parcours d'accueil ou la section
   équivalente du profil, **When** la membre choisit la réponse d'indécision,
   **Then** son intention est considérée comme déclarée.
2. **Given** une personne qui a choisi cette réponse, **When** une autre membre
   (qui a déclaré la sienne) ouvre sa fiche, **Then** elle y lit cette réponse,
   formulée sans jugement.
3. **Given** les filtres de Découvrir, **When** on filtre par intention, **Then**
   la réponse d'indécision est un choix comme les autres.

---

### User Story 3 - L'absence de distance s'explique et propose de la corriger (Priority: P2)

Une membre qui n'a partagé aucune position voit, là où une distance
s'afficherait (« Pour toi », fiche profil), une invitation courte (« Partage où
tu es pour voir les distances ») qui mène à l'étape « où » : position de
l'appareil ou ville saisie à la main.

**Why this priority**: la règle est déjà vraie ; le gain est de rendre l'étape
« où » désirable. Coût faible, effet attendu plus modeste que l'US1.

**Independent Test**: compte sans position → l'invitation est présente là où
une distance manquerait, et disparaît dès qu'une position (appareil ou ville)
est enregistrée.

**Acceptance Scenarios**:

1. **Given** une membre sans position, **When** elle parcourt « Pour toi »,
   **Then** l'invitation est présente une seule fois (FR-010) et mène à
   l'étape « où ».
2. **Given** une membre qui a une position, **When** l'autre personne n'en a
   pas, **Then** rien ne s'affiche à la place de la distance (ce n'est pas à
   elle d'agir).
3. **Given** une membre qui vient d'enregistrer une ville à la main, **When**
   elle revient dans Découvrir, **Then** les distances s'affichent en tranches
   comme aujourd'hui.

---

### Edge Cases

- **Déduction par filtre** : filtrer par intention permettrait de retrouver
  l'intention voilée d'une personne. Le filtre suit donc la même règle que
  l'affichage (US1, scénario 5), côté service.
- **Matches et conversations** : la règle reste la même après un match. Une
  personne sans intention déclarée ne lit pas celle de son match ; l'invitation
  y figure comme ailleurs.
- **Retrait de l'intention** : si une membre vide son intention après l'avoir
  déclarée, le voile revient pour elle.
- **Mode invisible** : aucun changement ; le voile porte sur ce que la membre
  *lit*, pas sur ce qu'elle montre.
- **Admin** : les surfaces d'administration ne sont pas concernées.
- **Profils existants** : aucune migration ; une membre qui a déjà une intention
  ne voit aucune différence.
- **Échec de la règle** (profil de la lectrice introuvable, erreur de lecture) :
  le voile s'applique (fermé par défaut, principe III).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le service MUST omettre l'intention d'autrui de **toute** réponse
  destinée à une membre qui n'a pas d'intention déclarée : fiche profil,
  « À proximité », Croisements en chemin, et toute surface future qui l'expose.
- **FR-002**: L'omission MUST être distinguable d'une absence d'intention chez
  l'autre personne (« voilé pour toi » vs « non renseigné »), pour que
  l'interface n'affiche l'invitation que quand il y a quelque chose à dévoiler.
- **FR-003**: Le service MUST ignorer le filtre par intention d'une membre sans
  intention déclarée ; l'interface MUST le présenter comme non utilisable, avec
  la même invitation.
- **FR-004**: Une membre MUST toujours voir sa propre intention.
- **FR-005**: Le système MUST proposer une réponse d'indécision parmi les
  intentions, disponible partout où l'on choisit son intention (parcours
  d'accueil, profil) et dans le filtre, sous la forme d'une **nouvelle valeur
  dédiée** libellée « Je verrai en chemin », distincte de « autre » (qui garde
  son sens : une intention précise hors liste).
- **FR-006**: Toute intention déclarée, y compris la réponse d'indécision, MUST
  lever le voile.
- **FR-007**: L'invitation d'intention MUST mener au choix de l'intention (même
  geste que l'étape 1 du parcours d'accueil) puis ramener la membre là où elle
  était.
- **FR-008**: Une membre sans position MUST voir, à la place d'une distance
  manquante, une invitation qui mène à l'étape « où » (appareil ou ville).
- **FR-009**: L'invitation de distance MUST ne s'afficher que lorsque c'est la
  **lectrice** qui n'a pas de position ; l'absence de position de l'autre
  personne ne produit aucune invitation.
- **FR-010**: L'invitation de distance MUST rester discrète : une seule
  occurrence visible par écran de « Pour toi », pas une par carte.
- **FR-011**: Les copies MUST être en français, au tutoiement, sans chiffre,
  sans culpabiliser, sans mentionner d'autres membres ni leur nombre, et
  cohérentes avec la carte de relance et le parcours d'accueil existants.
- **FR-012**: Aucune fonctionnalité MUST NOT devenir inaccessible : Découvrir,
  les fiches, les messages et les matches restent utilisables sans intention ni
  position.
- **FR-013**: La confidentialité de la position est inchangée : ville saisie et
  source de position restent privées ; les distances restent en tranches.
- **FR-014**: La règle MUST être couverte par un test de non-régression **par
  route** qui expose l'intention (principe III, corollaire #328).

### Key Entities

- **Intention (ce que je cherche)** : attribut du profil, liste de valeurs
  parmi libre, poly, casual, sérieux, autre, et la nouvelle réponse
  d'indécision « Je verrai en chemin ». Une
  liste vide = non déclarée.
- **État de lecture de l'intention** : dérivé à chaque requête pour un couple
  (lectrice, personne lue) : visible, voilée pour la lectrice, ou non
  renseignée. Jamais stocké.
- **Position** : existante (spec 004) ; seule sa présence ou son absence chez
  la lectrice est utilisée ici.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0 réponse du service contenant l'intention d'autrui destinée à
  une membre sans intention déclarée, vérifié sur chaque route qui l'expose.
- **SC-002**: La part des profils actifs avec une intention déclarée augmente
  d'au moins 10 points dans les 30 jours suivant la mise en ligne, mesurée sur
  le bloc « accueil » des statistiques admin, par rapport à la ligne de base
  relevée à la relecture J+21 de la spec 005 (2026-10-11).
- **SC-003**: La part des profils actifs avec une position (appareil ou ville)
  augmente d'au moins 5 points sur la même fenêtre.
- **SC-004**: Aucune hausse des abandons de première session (comptes sans
  aucune activité 7 jours après l'inscription) par rapport à la même ligne de
  base.
- **SC-005**: Aucun retour membre qualifiant la règle de « blocage » ou de
  « chantage » dans les 30 jours (lecture de la file des retours).

## Assumptions

- La mise en ligne attend la relecture J+21 de la spec 005 (2026-10-11), pour
  que l'effet de cette spec soit lisible séparément de celui du parcours
  d'accueil.
- « Pour toi » ne montre pas l'intention sur les cartes aujourd'hui ; la spec
  n'en ajoute pas. Elle s'applique là où l'intention est déjà exposée.
- « À proximité » a déjà un état vide qui explique l'absence de position ; il
  n'est pas modifié.
- Le filtre de distance d'une membre sans position garde son comportement
  actuel.
- Les surfaces admin et l'export de ses propres données ne sont pas concernés.
- Les seuils de SC-002/SC-003 sont indicatifs : la base compte une centaine de
  comptes, un écart de quelques points reste dans le bruit.
