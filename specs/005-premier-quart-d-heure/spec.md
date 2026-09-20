# Feature Specification: Le premier quart d'heure — onboarding progressif

**Feature Branch**: `feat/005-premier-quart-d-heure`

**Created**: 2026-09-20

**Status**: Draft

**Input**: User description: "Le premier quart d'heure — onboarding progressif post-inscription pour que chaque inscrit ressorte de sa première session avec un profil likeable (photo), ce qu'il cherche (type de relation, genre/orientation recherchés), une position (GPS ou ville), et le push opt-in proposé à la fin pour être prévenu d'un match. Inclut : créer le Profile à l'inscription + rattrapage des orphelins (#342), onboarding en 3 étapes passables jamais bloquantes (#135), proposition push opt-in en fin d'onboarding, relance de complétion in-app sans appât pour les inscrits existants sans photo (#343). Contexte chiffré au 2026-09-20 : 82 inscrits (42 cette semaine), 20/72 profils avec photo, 10/72 avec position, 0 push, 2/40 revenus après J+1, 1 match. Charte : pas de « quelqu'un t'a aimé », pas d'e-mail, pas de compteur-appât ; seul le match justifie une notification."

**Issues rattachées** : #135 (onboarding progressif), #342 (profil créé à
l'inscription), #343 (relance de complétion). Cette spec les remplace comme
source de vérité ; les issues restent les tickets de livraison.

## Contexte

Libre enregistre des inscriptions tous les jours (82 comptes au 2026-09-20,
dont 42 sur la dernière semaine). Mais la base réelle montre que presque tout
se perd dans la première session :

| Étape | Chiffre au 2026-09-20 |
|---|---|
| Comptes | 82 |
| Comptes avec une ligne de profil | 72 |
| Profils avec au moins une photo | 20 |
| Profils avec une position (géoloc ou ville) | 10 |
| Profils avec un type de relation déclaré | 24 |
| Appareils abonnés aux notifications | 0 |
| Likes envoyés sur 7 jours | 102 |
| Matches (réciprocités) depuis l'ouverture | 1 |
| Inscrits depuis plus de 7 jours revenus après le lendemain | 2 sur 40 |

La chaîne est simple : un nouvel inscrit arrive sur Découvrir avec un profil
vide, voit des cartes vides, n'a ni photo (donc personne ne le likera) ni
position (donc « À proximité » et les croisements ne le verront jamais), et
ne revient pas. La personne qu'il a likée ne revient pas non plus. Il n'y a
donc jamais de réciprocité, jamais de match, jamais de conversation.

La charte produit ferme les raccourcis habituels : pas de « quelqu'un t'a
aimé », pas de relance par e-mail, pas de compteur-appât. Le seul événement
dont on a le droit de prévenir est le match — et il n'y en a pas parce que
les profils sont vides. Le levier n'est donc pas de ramener les gens de
force : c'est de faire en sorte que **le premier quart d'heure produise un
profil qui peut être choisi**, et que la personne ait accepté d'être prévenue
le jour où ça matche.

## Clarifications

### Session 2026-09-20

- Q: Les profils avec photo passent-ils avant les profils sans photo dans « Pour toi » ? → A: Oui, photo d'abord, sans masquer personne (FR-022).
- Q: Les membres déjà inscrits voient-ils le parcours guidé ou seulement la carte de relance ? → A: Le parcours une fois pour un profil entièrement vide ; la carte seule dès qu'un élément existe (FR-023).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Exister dès l'inscription (Priority: P1)

Une personne qui vient de créer son compte existe immédiatement pour les
autres membres : elle a un profil, même vide, et apparaît dans Découvrir avec
ce qu'elle a renseigné. Les comptes créés avant cette version et restés sans
profil sont rattrapés : ils existent aussi.

**Why this priority**: c'est le socle. Aujourd'hui 10 inscrits sur 82 n'ont
aucune ligne de profil et sont invisibles de tout le monde, définitivement,
sans que rien ne le leur dise. Tout le reste de la spec suppose qu'un compte
a un profil.

**Independent Test**: créer un compte, ne rien faire d'autre, se connecter
avec un second compte : le premier apparaît dans « Pour toi ». Vérifier
qu'aucun compte existant n'est sans profil après le rattrapage.

**Acceptance Scenarios**:

1. **Given** un visiteur sur le formulaire d'inscription, **When** il crée son compte, **Then** un profil lui est associé dans la même opération, sans action de sa part.
2. **Given** un compte créé avant cette version et sans profil, **When** la version est déployée, **Then** ce compte a un profil vide et apparaît dans « Pour toi » des autres membres.
3. **Given** un compte tout juste créé sans date de naissance, **When** un autre membre parcourt « Pour toi » sans filtre d'âge, **Then** ce compte apparaît (l'absence d'âge n'exclut pas, seule une restriction d'âge explicite le fait).
4. **Given** des profils avec et sans photo, **When** un membre ouvre « Pour toi », **Then** les profils avec photo viennent d'abord et les profils sans photo suivent — aucun n'est masqué.

---

### User Story 2 - Un premier quart d'heure guidé (Priority: P1)

Juste après l'inscription, avant d'arriver dans Découvrir, la personne est
accompagnée en trois étapes courtes : **une photo**, **ce qu'elle cherche**
(type de relation, et qui elle souhaite voir), **où elle est** (position de
l'appareil, ou sa ville). Chaque étape peut être passée d'un geste ; rien ne
bloque. À la fin, elle arrive dans Découvrir.

**Why this priority**: c'est l'objet de la spec. 20 profils sur 72 ont une
photo, 10 sur 72 une position. Tant que ces deux chiffres ne bougent pas, il
ne peut pas y avoir de réciprocité.

**Independent Test**: créer un compte, dérouler les trois étapes en
renseignant tout, arriver dans Découvrir : le profil a une photo, un type de
relation, des préférences de recherche et une position. Recommencer en
passant chaque étape : on arrive quand même dans Découvrir, sans erreur, et
le profil est vide.

**Acceptance Scenarios**:

1. **Given** un compte tout juste créé, **When** l'inscription se termine, **Then** la personne voit la première étape (photo) et non Découvrir.
2. **Given** l'étape photo, **When** la personne ajoute une photo, **Then** la photo est enregistrée sur son profil et l'étape suivante s'affiche.
3. **Given** n'importe quelle étape, **When** la personne choisit « Plus tard », **Then** l'étape suivante s'affiche (ou Découvrir après la dernière) sans que rien ne soit exigé.
4. **Given** l'étape « ce que je cherche », **When** la personne choisit un ou plusieurs types de relation et, si elle le souhaite, les genres et orientations qu'elle veut voir, **Then** ces choix alimentent à la fois ce qu'elle déclare sur son profil et ses filtres de recherche.
5. **Given** l'étape « où », **When** la personne accepte la position de l'appareil, **Then** sa position est enregistrée avec la même précision volontairement grossière qu'ailleurs dans l'app ; **When** elle refuse ou que ça échoue, **Then** elle peut saisir sa ville à la place, comme dans le profil.
6. **Given** une personne qui quitte l'app au milieu du parcours, **When** elle revient, **Then** elle reprend à l'étape où elle s'était arrêtée, une seule fois ; si elle passe tout, le parcours ne se représente plus de lui-même.
7. **Given** le parcours entier, **When** la personne le déroule sur un téléphone, **Then** chaque étape tient dans l'écran sans défilement horizontal et les cibles tactiles restent confortables.

---

### User Story 3 - Accepter d'être prévenu·e d'un match (Priority: P2)

À la fin du parcours, la personne se voit proposer d'être prévenue **sur cet
appareil** si un match se produit. C'est une proposition, pas une exigence :
elle peut refuser, et la même possibilité reste dans Paramètres.

**Why this priority**: aujourd'hui aucun appareil n'est abonné, parce que la
proposition n'est faite qu'au fond des Paramètres. Le match est le seul
événement dont la charte autorise la notification ; c'est aussi la seule
raison honnête de revenir. Sans cette étape, un match qui se produit pendant
que la personne est partie ne lui parvient jamais.

**Independent Test**: dérouler le parcours sur un appareil qui supporte les
notifications, accepter : l'appareil apparaît comme abonné dans Paramètres.
Refuser : rien n'est enregistré, Paramètres propose toujours l'activation.

**Acceptance Scenarios**:

1. **Given** la dernière étape du parcours sur un appareil compatible, **When** la personne accepte, **Then** l'appareil est abonné et Paramètres le reflète.
2. **Given** la dernière étape, **When** la personne refuse ou passe, **Then** aucun abonnement n'est créé et la proposition n'est pas répétée par le parcours ; Paramètres reste le seul endroit pour l'activer.
3. **Given** un appareil ou un navigateur qui ne supporte pas les notifications, **When** la personne atteint la fin du parcours, **Then** l'étape n'est pas proposée et elle arrive directement dans Découvrir.
4. **Given** la proposition, **When** on lit son texte, **Then** il ne parle que du match (« si ça matche ») — jamais de likes reçus, de messages en attente ni d'activité des autres.

---

### User Story 4 - Une relance qui ne harcèle pas (Priority: P2)

Un membre déjà inscrit dont le profil est incomplet voit, dans Découvrir, une
carte qui lui dit ce qui manque à son profil pour être choisi — la photo
d'abord — et l'emmène le compléter en un geste. Elle peut être écartée, et
elle disparaît d'elle-même dès que le profil est complet.

**Why this priority**: 52 membres inscrits avant cette version n'ont pas de
photo. Le parcours guidé ne les concerne pas ; la relance est le seul moyen de
les atteindre dans la charte (in-app, sans e-mail, sans compteur).

**Independent Test**: se connecter avec un compte sans photo : la carte est
visible en tête de Découvrir. Ajouter une photo : la carte disparaît. Sur un
compte sans photo, écarter la carte : elle ne revient pas avant un délai.

**Acceptance Scenarios**:

1. **Given** un membre sans photo, **When** il ouvre Découvrir, **Then** une carte « ton profil » précède les profils et propose d'ajouter une photo.
2. **Given** un membre avec photo mais sans position ni type de relation, **When** il ouvre Découvrir, **Then** la carte propose l'élément manquant suivant, dans l'ordre photo > type de relation > position.
3. **Given** la carte affichée, **When** le membre l'écarte, **Then** elle n'est pas réaffichée pendant au moins sept jours.
4. **Given** un profil qui a une photo, un type de relation et une position, **When** il ouvre Découvrir, **Then** aucune carte de relance n'est affichée.
5. **Given** la carte, **When** on lit son texte, **Then** il parle du profil de la personne, jamais des autres (aucun « X personnes t'attendent », aucun nombre).

---

### Edge Cases

- Une personne ferme l'app pendant le téléversement de la photo : le profil reste cohérent (soit la photo est là, soit elle n'y est pas), et le parcours reprend à l'étape photo.
- Une photo refusée (format, poids, modération) à l'étape photo : le message explique et laisse réessayer ou passer ; on ne coince jamais la personne.
- Un compte qui avait déjà une photo, un type de relation ou une position avant d'atteindre le parcours (membre existant) : le parcours ne se montre pas, seule la carte de relance s'applique.
- Deux onglets ouverts pendant le parcours : la progression se résout sans doublon ni perte.
- La position de l'appareil est refusée au niveau système et la ville saisie n'est pas trouvée : l'étape reste passable, et Découvrir continue de proposer la ville comme aujourd'hui.
- Le rattrapage des comptes sans profil tombe sur un compte banni ou supprimé entre-temps : il est ignoré sans faire échouer les autres.
- La proposition de notifications est acceptée puis le navigateur révoque l'autorisation : l'app se comporte comme si la personne n'avait jamais accepté.

## Requirements *(mandatory)*

### Functional Requirements

**Exister dès l'inscription**

- **FR-001** : La création d'un compte DOIT créer son profil dans la même opération ; il n'existe plus d'état « compte sans profil » pour un compte nouvellement créé.
- **FR-002** : Un rattrapage ponctuel DOIT donner un profil vide à tout compte existant qui n'en a pas, sans modifier les comptes qui en ont un.
- **FR-003** : Un profil sans date de naissance DOIT apparaître dans « Pour toi » tant que le membre qui regarde n'a pas posé de restriction d'âge explicite.

**Parcours guidé**

- **FR-004** : Après l'inscription, la personne DOIT être conduite au parcours guidé plutôt qu'à Découvrir.
- **FR-005** : Le parcours DOIT comporter exactement trois étapes, dans cet ordre : photo ; ce que je cherche (type de relation, puis genres et orientations souhaités) ; où (position de l'appareil ou ville).
- **FR-006** : Chaque étape DOIT pouvoir être passée par une action explicite (« Plus tard ») sans condition, et aucune étape ne DOIT exiger une saisie pour continuer.
- **FR-007** : Chaque saisie DOIT être enregistrée à l'étape où elle est faite, indépendamment des étapes suivantes.
- **FR-008** : L'étape « ce que je cherche » DOIT alimenter à la fois le type de relation déclaré sur le profil et les filtres de recherche (type de relation, genres, orientations souhaités).
- **FR-009** : L'étape « où » DOIT proposer la position de l'appareil puis, en cas de refus ou d'échec, la saisie de la ville, avec les mêmes garanties de précision grossière que le reste de l'app.
- **FR-010** : Le parcours DOIT reprendre à l'étape en cours si la personne revient après l'avoir quitté, et ne DOIT plus se représenter une fois terminé ou entièrement passé.
- **FR-011** : Le parcours NE DOIT PAS être présenté à un compte dont le profil a déjà une photo, un type de relation et une position.
- **FR-012** : Le parcours DOIT respecter la charte visuelle existante (composants et tokens du Design System, aucune nouvelle direction artistique) et être utilisable au doigt sur téléphone.

**Notifications de match**

- **FR-013** : À la fin du parcours, sur un appareil compatible, la personne DOIT se voir proposer d'être prévenue d'un match sur cet appareil.
- **FR-014** : L'acceptation DOIT produire le même abonnement que l'activation depuis Paramètres ; le refus NE DOIT rien enregistrer et NE DOIT PAS être redemandé par le parcours.
- **FR-015** : Le texte de la proposition NE DOIT mentionner que le match ; aucune référence aux likes reçus, aux messages ni à l'activité d'autres membres.
- **FR-016** : Sur un appareil ou navigateur incompatible, l'étape NE DOIT PAS être affichée.

**Relance de complétion**

- **FR-017** : Découvrir DOIT afficher, avant les profils, une carte de relance à tout membre dont le profil manque d'une photo, d'un type de relation ou d'une position, dans cet ordre de priorité.
- **FR-018** : La carte DOIT mener en un geste à la complétion de l'élément manquant, et DOIT disparaître dès que l'élément est renseigné.
- **FR-019** : La carte DOIT pouvoir être écartée et NE DOIT PAS réapparaître avant sept jours sur le même appareil.
- **FR-020** : La carte NE DOIT afficher aucun nombre ni aucune référence aux autres membres ; elle parle du profil de la personne, et d'elle seule.
- **FR-021** : Aucune relance NE DOIT être envoyée hors de l'app (ni e-mail, ni notification) au titre de cette spec.

**Ordre du feed**

- **FR-022** : « Pour toi » DOIT présenter les profils qui ont au moins une photo avant ceux qui n'en ont pas, sans masquer personne : un profil sans photo reste visible, plus bas. À photo égale, l'ordre actuel (activité récente) est conservé.

**Membres existants et parcours**

- **FR-023** : Un membre inscrit avant cette version dont le profil est **entièrement vide** (ni photo, ni type de relation, ni position) DOIT voir le parcours guidé une seule fois à sa prochaine connexion, avec les mêmes étapes passables ; dès qu'au moins un de ces trois éléments existe, il ne voit que la carte de relance (FR-017).

### Key Entities

- **Profil** : ce qu'un membre déclare et cherche. Existe dès l'inscription. Porte la photo, le type de relation, les préférences de recherche et la position.
- **Progression du parcours** : où en est un membre dans le parcours guidé (étape en cours, terminé, passé). Ne concerne que la personne ; jamais visible des autres.
- **Relance écartée** : le fait qu'un membre a écarté la carte de relance, et quand — pour ne pas la lui remontrer avant sept jours.
- **Abonnement de notification** : un appareil qui a accepté d'être prévenu d'un match. Existe déjà ; la spec ne fait qu'en proposer la création plus tôt.

## Success Criteria *(mandatory)*

Mesurés sur les comptes créés après la mise en ligne, trois semaines après.

### Measurable Outcomes

- **SC-001** : 100 % des comptes ont un profil (contre 72 sur 82 aujourd'hui), nouveaux comme anciens.
- **SC-002** : Au moins 60 % des nouveaux inscrits ont une photo à la fin de leur première session (contre 28 % de l'ensemble aujourd'hui).
- **SC-003** : Au moins 50 % des nouveaux inscrits ont une position à la fin de leur première session (contre 14 % aujourd'hui).
- **SC-004** : Au moins 60 % des nouveaux inscrits ont déclaré un type de relation (contre 33 % aujourd'hui).
- **SC-005** : Au moins 30 % des nouveaux inscrits ont accepté d'être prévenus d'un match sur un appareil (contre 0 aujourd'hui).
- **SC-006** : Au moins 20 % des nouveaux inscrits reviennent après leur premier jour (contre 5 % aujourd'hui).
- **SC-007** : Il se produit au moins un match par semaine (contre un depuis l'ouverture).
- **SC-008** : Le parcours guidé complet, sans passer d'étape, prend moins de cinq minutes à une personne qui a une photo sous la main.
- **SC-009** : Aucune personne ne se retrouve bloquée : passer les trois étapes conduit toujours à Découvrir.

## Assumptions

- Le parcours guidé ne concerne que les trois éléments qui conditionnent la réciprocité (photo, ce que je cherche, position). La bio, les centres d'intérêt et les pratiques restent dans le profil : les y mettre allongerait le parcours sans changer qui peut être choisi.
- « Ce que je cherche » réutilise exactement les options existantes du profil (types de relation, genres, orientations) ; aucune nouvelle taxonomie.
- La position saisie dans le parcours suit les règles de la spec 004 (précision grossière, ville privée, géocodage sans clé) — cette spec n'en change rien.
- La proposition de notification réutilise l'abonnement par appareil déjà livré (spec 003) ; cette spec ne crée aucun nouvel événement notifié. Le match reste le seul.
- Le rattrapage des comptes sans profil est une opération ponctuelle, faite une fois au déploiement, sans effet sur les comptes déjà pourvus.
- La carte de relance vit dans « Pour toi » (là où la personne regarde), pas dans Paramètres ni dans un centre de notifications. Elle réutilise la carte de profil existante comme forme.
- Le refus de la proposition de notification et l'écartement de la carte de relance se mémorisent par appareil ; changer d'appareil peut donc les faire réapparaître une fois. C'est accepté.
- Aucune relance hors app : la décision « pas d'e-mail » (#43, spec 003) tient.
- Les critères de succès se lisent dans l'admin existant ; s'il manque une mesure (ex. « revenus après J+1 »), elle s'ajoute à l'admin dans le cadre de cette spec, jamais côté membre.
