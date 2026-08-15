# Feature Specification: Photos explicites — flou par défaut et consentement du regard

**Feature Branch**: `001-photos-explicites`

**Created**: 2026-08-15

**Status**: Clarifié — prêt pour le plan

**Clarifications** : 2026-08-15, avec l'opérateur (4 décisions, cf. § Décisions tranchées)

**Input**: User description: « J'ai un 1er utilisateur qui a upload une photo de lui en slibard. Moyen de définir une option pour flouter fortement des photos par défaut et cliquer sur voir pour la déverrouiller, c'est raccord avec une option côté profil du genre : j'accepte de voir des photos d'utilisateur modéré et classé comme explicite. »

## Contexte

Une photo de sous-vêtements est arrivée en production. Aujourd'hui, face à une
photo hors charte, l'administration n'a qu'un levier : **la retirer**
(`DELETE /api/admin/users/[id]/photos`, #323). C'est binaire et disproportionné —
la personne n'a rien fait d'illégal, elle a mal jugé le cadre. À l'autre bout,
la personne qui parcourt Découvrir reçoit cette photo en pleine figure sans
l'avoir demandé.

Il manque l'échelon intermédiaire : **classer** au lieu de supprimer, et laisser
chacun décider de ce qu'il regarde.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Modérer sans supprimer (Priority: P1)

Un modérateur voit, depuis la fiche d'administration d'un profil, une photo qui
n'est pas hors-la-loi mais qui n'a pas à s'afficher sans prévenir. Il la classe
**explicite** avec un motif. Dès cet instant, plus personne ne la reçoit en
clair sans l'avoir demandée : elle arrive floutée, avec un bouton « Voir ».

**Why this priority**: C'est le seul récit qui résout le cas réel déjà en
production, et rien d'autre ne peut exister sans lui — sans classification, il
n'y a rien à flouter. Il remplace une sanction disproportionnée par un geste
proportionné.

**Independent Test**: Classer une photo depuis l'admin, puis la consulter depuis
un autre compte : elle doit arriver floutée et se révéler au clic. Livrable et
démontrable seul.

**Acceptance Scenarios**:

1. **Given** un profil avec une photo hors charte, **When** un modérateur la
   classe « explicite » avec un motif, **Then** l'action est journalisée
   (`ModerationLog`) et la photo reste en place, ni supprimée ni cachée.
2. **Given** une photo classée explicite, **When** un autre compte ouvre le
   profil, **Then** la photo s'affiche floutée avec un bouton « Voir » et
   aucune version nette n'est transmise avant le clic.
3. **Given** une photo classée explicite, **When** son propriétaire consulte son
   propre profil, **Then** il la voit nette, avec une mention indiquant qu'elle
   est classée explicite.
4. **Given** une photo classée par erreur, **When** un modérateur la déclasse,
   **Then** elle redevient immédiatement visible normalement, et le
   déclassement est journalisé.

---

### User Story 2 - Choisir une fois pour toutes (Priority: P2)

Une personne qui assume ce type de contenu ne veut pas cliquer « Voir » sur
chaque photo. Elle règle dans son profil qu'elle accepte de voir les photos
classées explicites, et le flou disparaît pour elle.

**Why this priority**: Sans ce réglage, US1 fonctionne mais fatigue les gens que
le contenu ne dérange pas. Avec, le produit rend la décision **explicite et
réversible** au lieu de la subir photo par photo.

**Independent Test**: Activer l'option dans le profil, recharger un profil
portant une photo classée : elle s'affiche nette sans clic. Désactiver : le flou
revient.

**Acceptance Scenarios**:

1. **Given** un compte dont l'option est désactivée (état par défaut), **When**
   il rencontre une photo classée, **Then** elle est floutée avec « Voir ».
2. **Given** un compte qui active l'option, **When** il rencontre une photo
   classée, **Then** elle s'affiche nette sans action supplémentaire.
3. **Given** un compte qui désactive l'option après l'avoir activée, **When** il
   recharge, **Then** le flou est rétabli partout.

---

### User Story 3 - Se déclarer soi-même (Priority: P3)

Au moment d'ajouter une photo qu'elle sait suggestive, la personne peut la
marquer elle-même comme explicite, sans attendre qu'un modérateur passe.

**Why this priority**: C'est le chemin sain — la modération a posteriori ne
passe pas à l'échelle et arrive toujours après que quelqu'un a vu la photo. Mais
la feature tient debout sans, d'où P3.

**Independent Test**: Marquer une photo à l'upload, la consulter depuis un autre
compte : elle est floutée comme si un modérateur l'avait classée.

**Acceptance Scenarios**:

1. **Given** une personne qui ajoute une photo, **When** elle coche « cette
   photo est explicite », **Then** la photo est classée sans intervention
   d'un modérateur.
2. **Given** une photo auto-déclarée explicite, **When** un modérateur la
   déclasse, **Then** la décision du modérateur prime.
3. **Given** une photo classée par un modérateur, **When** son propriétaire
   tente de la déclasser, **Then** il ne peut pas : la décision de modération
   prime. Il peut retirer la photo, ou passer par le canal de signalement
   existant pour contester.

---

### Edge Cases

- **L'avatar (`photos[0]`) classé** : il **reste** avatar et s'affiche flouté
  dans le feed pour les comptes non consentants. Une classification ne
  réorganise pas le profil de quelqu'un sans son accord ; la gêne d'une vignette
  floutée dans Découvrir est précisément ce qui incite à changer d'avatar.
- **Aucune photo nette disponible** : un profil dont toutes les photos sont
  classées, vu par un compte qui refuse ce contenu, n'a plus aucune image à
  montrer. La carte doit rester lisible (initiale, comme un profil sans photo).
- **Consentement au clic pour un compte qui a refusé** : le bouton « Voir »
  fonctionne **toujours**. Le réglage exprime un défaut, pas une interdiction :
  le flou est une porte, jamais un mur.
- **Photo classée pendant qu'une page est ouverte** : l'URL signée déjà obtenue
  reste valable un temps (cache privé de 15 min). La classification ne peut donc
  pas être rétroactive à la seconde près ; elle prend effet au prochain accès.
- **Modération et signalement** : un signalement pour « contenu inapproprié »
  (#151) devrait pouvoir déboucher sur une classification plutôt qu'un retrait.
  Hors périmètre ici, mais le modèle ne doit pas l'empêcher.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système DOIT permettre d'associer une classification à **chaque
  photo individuellement**, indépendamment des autres photos du même profil.
- **FR-002**: Le système DOIT proposer trois états : *ordinaire*, *suggestif*
  et *explicite*. Le cas qui a déclenché la feature (sous-vêtements) est
  *suggestif* : le classer *explicite* serait plus sévère que la réalité, et
  une échelle binaire forcerait ce faux choix à chaque acte de modération.
- **FR-003**: Un modérateur DOIT pouvoir classer et déclasser une photo depuis
  l'administration, **motif obligatoire**, chaque acte étant journalisé dans
  `ModerationLog` comme l'est déjà le retrait de photo.
- **FR-004**: Le système NE DOIT PAS transmettre l'image nette à un compte qui
  n'a pas consenti à la voir. Le flou DOIT être produit côté serveur : un flou
  CSS laisserait l'original arriver dans le navigateur, donc lisible dans
  l'onglet réseau — ce serait une garantie affichée sans code derrière, ce que
  la charte interdit explicitement (principe III).
- **FR-005**: Le propriétaire d'une photo DOIT toujours voir ses propres photos
  nettes, et DOIT être informé qu'une des siennes est classée explicite.
- **FR-006**: Les utilisateurs DOIVENT pouvoir régler, depuis leur profil,
  jusqu'à quel niveau ils acceptent de voir les photos classées : *rien*,
  *jusqu'au suggestif*, *tout*. **Le réglage par défaut est le refus** (rien),
  y compris pour les comptes existants.
- **FR-011**: Le flou servi DOIT être un **dérivé d'image généré au moment du
  classement** et stocké aux côtés de l'original : on y devine une silhouette,
  ce qui garde la vignette lisible comme photo (FR-007) sans jamais transmettre
  l'original. Générer à la volée referait le même travail à chaque affichage ;
  une tuile opaque perdrait l'affordance.
- **FR-007**: Une photo classée explicite affichée à un compte non consentant
  DOIT rester identifiable comme photo (surface floutée, pas un trou), avec une
  action explicite pour la révéler.
- **FR-008**: La révélation au clic NE DOIT PAS modifier le réglage de profil de
  la personne : voir une photo n'est pas consentir à toutes les suivantes.
- **FR-009**: Le système DOIT conserver le modèle d'accès existant : l'avatar
  reste la seule photo publique, les autres restent réservées aux matches, et un
  admin franchissant la garde reste journalisé. La classification s'**ajoute**
  à ces règles, elle ne les remplace pas.
- **FR-010**: La classification DOIT survivre au réordonnancement et au retrait
  d'autres photos du profil.

### Key Entities

- **Photo** : aujourd'hui une simple clé R2 dans un tableau `Profile.photos`,
  sans identité propre. Porter une classification par photo impose de lui donner
  des attributs : la clé, son rang, son état de classification, qui l'a classée
  et quand, et le motif. C'est le changement structurant de cette feature.
- **Préférence de visionnage** : attribut du profil du **lecteur** (et non de la
  photo), qui exprime son consentement à voir ce contenu. Voisin de
  `practicesVisibility` (#328) : fermé par défaut.
- **Acte de modération** : entrée `ModerationLog` existante, à étendre de deux
  actions (classer, déclasser) aux côtés de `REMOVE_PHOTO` et
  `VIEW_PRIVATE_PHOTO`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Une photo hors charte peut être traitée **sans être supprimée** :
  le modérateur dispose d'un geste proportionné là où il n'avait que la
  suppression.
- **SC-002**: Aucun compte n'affiche une photo classée explicite en clair sans
  un consentement explicite — vérifié route par route, y compris en inspectant
  la réponse réseau et non seulement le rendu.
- **SC-003**: Un compte consentant ne subit **aucun clic supplémentaire** par
  rapport à aujourd'hui.
- **SC-004**: Le geste de modération est traçable à 100 % : chaque
  classification et déclassement laisse un enregistrement avec auteur, cible,
  motif et date.
- **SC-005**: Aucune régression sur le modèle d'accès existant : la suite de
  non-régression sur `/api/photos/[key]` reste verte.

## Assumptions

- L'application est déjà réservée aux 18 ans et plus ; il ne s'agit pas d'un
  contrôle d'âge mais d'un contrôle du **regard**.
- Le contenu visé est **licite mais non désiré par défaut**. Le contenu illicite
  relève du retrait et du bannissement, pas de cette feature.
- La modération reste **humaine et a posteriori** : aucune classification
  automatique par modèle n'est prévue à ce stade.
- Le volume actuel (premiers comptes en production) autorise une modération
  manuelle ; la question du passage à l'échelle est hors périmètre.
- Le stockage R2 et le proxy `/api/photos/[key]` existants sont réutilisés.

## Dépendances

- #323 / PR #326 — modération des photos depuis l'admin (galerie, retrait,
  journalisation). Cette feature étend ce socle.
- #328 — le patron « réglage de visibilité fermé par défaut, appliqué côté
  serveur, testé par route » est le modèle direct de FR-004 et FR-006.

## Décisions tranchées *(clarification du 2026-08-15)*

| # | Question | Décision | Ce qu'on écarte et pourquoi |
|---|---|---|---|
| 1 | Échelle de classification | **Trois états** : ordinaire / suggestif / explicite | Le binaire forcerait à classer « explicite » une photo en sous-vêtements — plus sévère que la réalité, et le modérateur finirait par ne plus classer du tout. |
| 2 | Le bouton « Voir » pour un compte qui a refusé | **Il fonctionne toujours** | Un verrou dur obligerait à traverser les paramètres pour une seule photo. Le réglage exprime un défaut, pas une interdiction. |
| 3 | Un avatar classé | **Il reste avatar, flouté dans le feed** | Promouvoir automatiquement la photo suivante réorganiserait le profil de quelqu'un à la suite d'une décision de modération, et laisserait un profil sans avatar si tout est classé. |
| 4 | Production du flou | **Dérivé généré au classement**, stocké à côté de l'original | À la volée : même calcul répété à chaque affichage. Tuile opaque : on perd l'affordance « c'est une photo » que porte le flou. Flou CSS : exclu d'office, l'original arriverait dans le navigateur. |
