# Feature Specification: Ville saisie à la main, repli de la géolocalisation

**Feature Branch**: `feat/402-ville-manuelle`

**Created**: 2026-09-19

**Status**: Draft

**Input**: User description: "Saisie manuelle de la ville comme repli de la géolocalisation (#402). Un membre dont la géolocalisation navigateur ne fonctionne pas (appareil, VPN, réglage système, refus) peut indiquer sa ville dans son profil ; elle est géocodée côté serveur et stockée dans la même position que la géoloc automatique, sans exposer de nouveau champ aux autres membres. Le segment « À proximité », le filtre de distance et les croisements fonctionnent alors comme pour les autres. Invite depuis Découvrir quand la géoloc échoue, et réglage dans le profil."

## Contexte

Aujourd'hui, la seule façon d'exister « près de quelqu'un » dans Libre est
d'accepter la géolocalisation de son navigateur depuis la page Découvrir. Quand
elle ne fonctionne pas — réglage système, VPN, appareil sans service de
position, refus par principe — la personne est privée du segment « À
proximité », du filtre de distance et des croisements, et elle n'apparaît dans
le rayon de personne. Un signalement en production (#400) a montré que ce cas
n'est pas théorique.

La ville saisie à la main est un **repli** : elle place la personne sur la
carte avec la même précision volontairement grossière (à l'échelle d'un
quartier ou d'une ville) que la géolocalisation automatique, sans rien
révéler de plus aux autres membres.

## Clarifications

### Session 2026-09-19

- Q: Où la saisie de la ville est-elle proposée dans cette version ? → A: Profil + Découvrir (invite sur place à l'échec de géoloc) ; pas à l'inscription.
- Q: Ville enregistrée puis géolocalisation automatique réussie : laquelle compte ? → A: La dernière source qui parle ; le profil affiche toujours la source courante.
- Q: Couverture géographique des propositions ? → A: France d'abord (qualificatif = département), monde accepté en repli (qualificatif = pays).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Indiquer sa ville depuis son profil (Priority: P1)

Une membre dont la géolocalisation ne marche pas ouvre son profil, tape le nom
de sa ville, choisit la bonne dans les propositions (« Lyon », « Villeurbanne
», …) et enregistre. Dès lors, Découvrir lui propose « À proximité », le filtre
de distance mord, et elle apparaît dans le rayon des membres voisins — exactement
comme si sa géolocalisation avait fonctionné.

**Why this priority**: c'est la valeur entière de la feature. Sans elle, une
partie des membres n'existe pour personne.

**Independent Test**: sur un compte sans position, renseigner une ville dans
le profil, puis constater que « À proximité » affiche des profils triés par
distance et que le filtre de distance change le feed.

**Acceptance Scenarios**:

1. **Given** un compte sans position connue, **When** la membre saisit « Lyon » et
   choisit « Lyon (69) » dans les propositions puis enregistre, **Then** son
   profil affiche « Ta ville : Lyon » et Découvrir ne lui demande plus d'activer
   la géolocalisation.
2. **Given** une ville enregistrée, **When** elle ouvre « À proximité », **Then**
   elle voit des profils triés par distance croissante depuis sa ville.
3. **Given** une ville enregistrée, **When** un autre membre à moins de son rayon
   de recherche consulte « À proximité », **Then** elle y apparaît avec une
   distance en tranche, comme n'importe qui.
4. **Given** une saisie sans correspondance (« Xyzzy »), **When** elle valide,
   **Then** aucune position n'est modifiée et un message explique qu'aucune ville
   ne correspond, avec une invitation à préciser (code postal, pays).
5. **Given** une ville enregistrée, **When** un autre membre consulte son profil ou
   sa carte, **Then** le nom de la ville n'y figure nulle part — seule la
   distance en tranche est visible, comme avant.

---

### User Story 2 - Être invitée à saisir sa ville quand la géoloc échoue (Priority: P2)

Sur Découvrir, la membre clique « Activer ma géolocalisation », ça échoue
(refus, indisponible, délai dépassé). Au lieu de la laisser avec un message
d'erreur et rien d'autre, l'écran lui propose de renseigner sa ville sur place,
sans quitter la page. Une fois la ville choisie, le feed se recharge avec la
distance.

**Why this priority**: c'est le moment exact où le besoin apparaît. Sans
l'invite, la membre ne sait pas que le repli existe.

**Independent Test**: simuler un échec de géolocalisation sur Découvrir,
vérifier que l'invite de saisie apparaît sous le message, saisir une ville,
constater le rechargement du feed avec distances.

**Acceptance Scenarios**:

1. **Given** un échec de géolocalisation sur Découvrir (quel que soit le motif),
   **When** le message d'erreur s'affiche, **Then** il est suivi d'une saisie
   « Ou indique ta ville » utilisable sans navigation.
2. **Given** l'invite affichée, **When** la membre choisit une ville, **Then** le
   feed se recharge et le segment « À proximité » devient disponible.
3. **Given** l'appareil sans géolocalisation du tout (non supportée), **When** la
   membre arrive sur Découvrir, **Then** la saisie de ville est proposée d'emblée.

---

### User Story 3 - Changer ou retirer sa ville, et laisser la géoloc reprendre (Priority: P3)

La membre déménage, ou sa géolocalisation refonctionne. Depuis son profil elle
peut remplacer sa ville, la retirer (elle redevient « sans position »), et si
elle active la géolocalisation automatique, celle-ci prend le pas et le profil
indique que la position vient désormais de l'appareil.

**Why this priority**: cohérence dans le temps ; sans ça, la ville saisie
devient une donnée fantôme qui contredit la position réelle.

**Independent Test**: avec une ville enregistrée, la remplacer, puis la retirer,
puis activer la géolocalisation, en vérifiant à chaque étape ce que le profil
annonce et ce que Découvrir fait.

**Acceptance Scenarios**:

1. **Given** une ville enregistrée, **When** la membre en choisit une autre,
   **Then** la nouvelle position remplace l'ancienne immédiatement, sans délai
   d'attente.
2. **Given** une ville enregistrée, **When** elle la retire, **Then** le profil
   affiche « Aucune position » et Découvrir lui propose à nouveau géoloc ou ville.
3. **Given** une ville enregistrée, **When** la géolocalisation automatique
   réussit, **Then** la position de l'appareil remplace la ville et le profil
   n'affiche plus de nom de ville (source : ton appareil).
4. **Given** une position venue de l'appareil, **When** la membre saisit une ville,
   **Then** la ville prend le pas jusqu'à la prochaine géolocalisation réussie.

---

### Edge Cases

- Nom ambigu (« Saint-Denis » ×3, « Paris » au Texas) : les propositions portent
  un qualificatif (département, région ou pays) pour lever le doute ; jamais de
  choix silencieux par le système.
- Ville hors de France : acceptée, avec le pays en qualificatif.
- Saisie très courte (1–2 caractères) : pas de recherche déclenchée, pas d'erreur.
- Service de propositions indisponible : message « Réessaie dans un instant »,
  aucune position modifiée, le reste de l'écran fonctionne.
- Saisie répétée en rafale : la recherche de propositions est limitée en fréquence
  ; la membre voit la dernière saisie prise en compte.
- Mode invisible activé : la ville est acceptée dans le profil (la membre pourra
  la réutiliser) mais, comme pour la géolocalisation, elle n'est pas exploitée
  tant que le mode invisible est actif ; le profil le dit.
- Le nom de ville ne fuit jamais : ni dans les cartes de Découvrir, ni dans les
  profils publics, ni dans les charges utiles de notification, ni dans les
  exports admin autres que ceux qui montrent déjà la position.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Une membre connectée DOIT pouvoir rechercher une ville par son nom
  depuis son profil et choisir parmi des propositions qualifiées : département
  pour une ville française, pays pour une ville étrangère. Les villes de France
  sont proposées en premier ; une ville hors de France reste acceptée.
- **FR-002**: Le choix d'une ville DOIT positionner la membre à la position de
  cette ville, avec la même précision volontairement grossière que la
  géolocalisation automatique (aucune adresse, aucun quartier précis).
- **FR-003**: Une position venue d'une ville DOIT alimenter « À proximité », le
  filtre de distance et les croisements exactement comme une position venue de
  l'appareil ; aucun de ces trois usages ne distingue les deux sources.
- **FR-004**: Le nom de la ville NE DOIT être visible que par la membre elle-même
  ; il n'apparaît dans aucune surface consultée par d'autres membres ni dans
  aucune notification.
- **FR-005**: Le profil DOIT indiquer la source de la position courante : « Ta
  ville : X », « Position de ton appareil », ou « Aucune position ».
- **FR-006**: La membre DOIT pouvoir remplacer ou retirer sa ville à tout moment,
  sans délai d'attente entre deux changements.
- **FR-007**: Une géolocalisation automatique réussie DOIT remplacer la position
  issue de la ville, et une saisie de ville DOIT remplacer la position issue de
  l'appareil : la dernière source qui parle gagne.
- **FR-008**: Sur Découvrir, tout échec de géolocalisation (refus, indisponible,
  délai dépassé, non supportée) DOIT être suivi d'une proposition de saisir sa
  ville sur place ; le choix d'une ville y recharge le feed.
- **FR-009**: Une saisie sans correspondance ou un service de propositions
  indisponible NE DOIT modifier aucune position et DOIT afficher un message
  actionnable en français.
- **FR-010**: La recherche de propositions DOIT être limitée en fréquence par
  membre, et les propositions ne DOIVENT contenir que ce qui sert au choix
  (nom, qualificatif, pays).
- **FR-011**: La ville saisie DOIT être supprimée avec le compte, comme toute
  donnée de profil.
- **FR-012**: Toute la copie est en français, tutoiement, inclusive (« À
  proximité », « près de toi » ; jamais « IRL »).

### Key Entities

- **Position du profil** (existante) : latitude/longitude grossières + date de
  dernière mise à jour. Gagne un attribut **source** (appareil | ville | aucune).
- **Ville choisie** : libellé lisible (nom + qualificatif) attaché au profil,
  visible uniquement par la membre ; vide quand la source n'est pas « ville ».
- **Proposition de ville** : nom, qualificatif (département/région), pays,
  position associée. Transitoire, jamais stockée.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Une membre sans géolocalisation renseigne sa ville et voit « À
  proximité » fonctionner en moins d'une minute, sans quitter l'app ni lire une
  aide.
- **SC-002**: 100 % des échecs de géolocalisation sur Découvrir affichent la
  proposition de repli ; aucun ne laisse la membre sur un message d'erreur seul.
- **SC-003**: Aucune surface visible par un autre membre ni aucune notification ne
  contient le nom de la ville — vérifié par un test de non-régression par route
  qui sérialise le profil.
- **SC-004**: Pour deux membres à la même position, l'une par ville et l'autre par
  appareil, « À proximité », le filtre de distance et les croisements produisent
  des résultats identiques.
- **SC-005**: Dans les propositions, une ville homonyme est toujours différenciée
  par un qualificatif ; le système ne choisit jamais à la place de la membre.

## Assumptions

- Couverture mondiale : une ville hors de France est acceptée. Les propositions
  sont pensées d'abord pour la France (qualificatif = département), avec le pays
  pour le reste.
- La précision stockée est celle déjà en vigueur pour la géolocalisation
  automatique (arrondi à l'échelle du kilomètre) ; une ville positionne à son
  centre, ce qui est plus grossier encore. Le brouillage côté appareil (#401) ne
  s'applique pas à une ville : il n'y a rien à protéger dans un centre-ville.
- Le libellé de la ville est conservé sur le profil pour que la membre relise
  son choix ; il n'est jamais renvoyé à d'autres membres. La position, elle,
  reste soumise aux mêmes règles qu'aujourd'hui.
- Le délai d'attente de 10 minutes entre deux géolocalisations automatiques ne
  s'applique pas à la saisie d'une ville (un choix explicite n'est pas un signal
  d'appareil bavard) ; la recherche de propositions a sa propre limite de
  fréquence.
- Pas de saisie de ville à l'inscription dans cette version : le repli se
  propose là où le besoin apparaît (Découvrir) et se règle dans le profil.
  L'onboarding progressif (#135) pourra l'intégrer plus tard.
- Dépend de #400 (messages d'échec distincts) et #401 (charge utile brouillée),
  déjà en PR.
