# Feature Specification: Bureau de modération

**Feature Branch**: `011-bureau-moderation`

**Created**: 2026-10-13

**Status**: Draft

**Input**: User description: "Côté modération, rationaliser et refondre le backoffice. Une page dédiée aux indices levés, avec côte à côte les comptes multiples (plusieurs membres ont créé deux comptes après une faute de frappe dans leur adresse e-mail), une vision rapide du pourquoi c'est suspect, et la possibilité de réclamer l'un des deux types de vérification pour un lot de comptes. Prévenir les doublons à l'inscription (confirmation de l'e-mail). Une règle de purge des comptes inactifs, et une vue des comptes réellement actifs."

## Contexte

Les specs 006 et 010 ont produit des indices (photo ou texte réutilisé, appareil
partagé, inscriptions groupées, retour d'un banni…) et un niveau de fiabilité
dérivé. Leur lecture reste éclatée : la file « Profils à vérifier », la fiche
d'un membre et la page des vérifications montrent chacune un morceau. Trois
manques en découlent :

1. **Les comptes liés ne se voient pas ensemble.** Un indice « appareil
   partagé » pointe déjà vers l'autre compte, mais le modérateur doit ouvrir
   deux fiches pour comparer.
2. **Les gestes se font compte par compte.** Inviter au selfie (sans retrait,
   #511) ou exiger une vérification (avec retrait) demande autant d'allers-
   retours qu'il y a de comptes.
3. **Le doublon de bonne foi pollue la modération et les chiffres.** Plusieurs
   membres ont saisi une adresse fautive, n'ont jamais reçu le lien de
   vérification et ont recréé un compte. Le premier compte ne peut pas se
   connecter, n'a rien fait, mais lève un indice d'appareil partagé et compte
   parmi les inscrits.

Par ailleurs, l'activité réelle des membres n'est pas mesurée : la date
« dernière activité » bouge quand la fiche du compte change, pas quand le
membre revient (#498). Les chiffres « actifs 7 j / 30 j » comptent surtout les
nouveaux inscrits, et aucune règle de durée de vie des comptes ne peut s'y
appuyer. Jusqu'ici, la suppression de comptes inactifs ou jamais vérifiés
était explicitement exclue des règles de conservation, en attente d'une
décision de l'opérateur. Cette décision est prise (2026-10-13) : 30 jours pour
un compte jamais vérifié, 1 an d'inactivité avec préavis pour un compte
vérifié.

## Clarifications

### Session 2026-10-13

- Q: Un membre vérifié absent longtemps doit-il disparaître de Découvrir avant la suppression à 1 an ? → A: Oui, masqué de Découvrir après 3 mois sans présence, réapparition dès le retour, aucune suppression avant la règle d'un an.
- Q: L'action par lot permet-elle le retrait ou seulement l'invitation ? → A: Invitation libre par lot ; retrait par lot seulement pour des comptes d'une même grappe ou de niveau « douteux », avec la liste nominative des comptes à confirmer.
- Q: Relance-t-on un compte jamais vérifié avant sa suppression à 30 jours ? → A: Aucune relance. L'interface annonce la règle là où elle s'applique (formulaire d'inscription, écran « vérifie ta boîte », refus de connexion d'un compte non vérifié), en la justifiant par la volonté de garder une communauté à jour et fiable.
- Q: La page Indices remplace-t-elle la file « Profils à vérifier » ? → A: Oui. Le détail d'une grappe reprend toutes les décisions de la file (rien à signaler, exiger la vérification, bannir, analyse des photos) ; l'ancienne adresse redirige vers la page Indices.
- Ajout de l'opérateur : les filtres et tris des listes d'administration persistent dans l'adresse de la page, pour survivre à un aller-retour vers une fiche membre.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mesurer la présence réelle des membres (Priority: P1)

Un membre qui revient sur Libre sans rien modifier est désormais compté comme
présent ce jour-là. Le modérateur lit, dans les statistiques d'administration,
des « actifs 7 j / 30 j » et des « revenus après leur premier jour » qui
reflètent les retours, et non les modifications de fiche. Le tri de « Pour
toi » par activité s'appuie sur la même mesure.

**Why this priority**: prérequis de la vue des comptes actifs (US6) et de la
règle d'inactivité. Sans elle, une règle « 1 an sans venir » supprimerait des
membres fidèles qui n'éditent jamais leur profil.

**Independent Test**: sur une base factice, un membre se connecte deux jours
de suite sans rien modifier. Sa date de présence avance d'un jour à l'autre,
une seule fois par jour, et les statistiques d'administration le comptent
parmi les actifs et parmi les revenus.

**Acceptance Scenarios**:

1. **Given** un membre connecté dont la dernière présence date d'hier, **When** il ouvre l'app aujourd'hui, **Then** sa date de présence passe à aujourd'hui.
2. **Given** un membre déjà vu aujourd'hui, **When** il fait d'autres requêtes dans la journée, **Then** aucune nouvelle écriture n'a lieu.
3. **Given** un membre qui modifie son thème sans être revenu depuis 10 jours, **Then** il n'est pas compté parmi les actifs 7 j sur la seule foi de cette modification ancienne.
4. **Given** les statistiques d'administration, **When** l'opérateur les ouvre, **Then** « actifs 7 j », « actifs 30 j » et « revenus après J+1 » se calculent sur la date de présence.

---

### User Story 2 - Page « Indices » : les comptes liés côte à côte (Priority: P1)

Le modérateur ouvre une page unique qui liste les comptes portant des indices
non tranchés. Les comptes reliés par un indice (même appareil, même connexion
à l'inscription, même photo, même texte) sont regroupés en **grappes**. Pour
chaque grappe, une phrase dit pourquoi c'est suspect (« Ces deux comptes ont
été créés sur le même appareil, à 6 minutes d'écart ») et une comparaison
côte à côte montre, pour chaque compte : date d'inscription, adresse vérifiée
ou non, présence d'une photo, dernière présence, niveau de fiabilité, état de
vérification (aucune, invité, retiré, vérifié).

Une grappe de deux comptes dont l'un n'a jamais vérifié son adresse et
l'autre si, créés sur le même appareil, est classée **« doublon probable »**.
Le modérateur peut supprimer le compte orphelin en un geste confirmé ; le
geste est journalisé et les indices de la grappe sont tranchés.

**Why this priority**: c'est la demande centrale de l'opérateur. Elle réduit
le temps de lecture d'un cas et sépare la bonne foi (doublons) des cas qui
méritent une vérification.

**Independent Test**: sur une base factice, créer un compte non vérifié puis
un compte vérifié avec le même identifiant d'appareil, et deux comptes
partageant une photo. La page montre deux grappes, la première classée
« doublon probable », chacune avec sa phrase d'explication et sa comparaison.
La suppression de l'orphelin retire le compte, journalise l'action et fait
disparaître la grappe.

**Acceptance Scenarios**:

1. **Given** deux comptes liés par un indice d'appareil partagé, **When** le modérateur ouvre la page Indices, **Then** les deux comptes apparaissent dans une même grappe, côte à côte, avec la raison du lien en phrase complète.
2. **Given** une grappe dont un compte n'a jamais vérifié son adresse et l'autre si, liés par le même appareil, **Then** la grappe porte le classement « doublon probable » et apparaît dans un filtre dédié.
3. **Given** un doublon probable, **When** le modérateur confirme « supprimer le compte jamais vérifié », **Then** ce compte est supprimé, l'action est journalisée avec le modérateur et le motif « doublon », et l'autre compte n'a plus d'indice ouvert lié à cette grappe.
4. **Given** un compte isolé qui porte un indice sans lien vers un autre compte (lexique de l'arnaque, rafale de likes), **Then** il apparaît dans la page comme une grappe d'un seul compte, avec la phrase qui explique l'indice.
5. **Given** une grappe, **When** le modérateur la tranche « rien à signaler », **Then** elle quitte la liste et ses indices suivent la règle de conservation des dossiers clos sans suite.
6. **Given** les grappes, **Then** elles sont triées du niveau de fiabilité le plus bas au plus haut, puis de la plus récente à la plus ancienne.

---

### User Story 3 - Réclamer une vérification pour un lot de comptes (Priority: P2)

Depuis la page Indices, le modérateur coche plusieurs comptes (dans une même
grappe ou dans plusieurs) et choisit l'un des deux gestes : **inviter au
selfie** (le membre reste visible et peut écrire) ou **exiger une
vérification** (le compte est mis en retrait jusqu'au selfie). Un écran de
confirmation récapitule le nombre de comptes et l'effet du geste. Le résultat
indique combien de comptes ont été traités et combien ont été ignorés, avec la
raison (déjà vérifié, déjà invité, déjà en retrait).

**Why this priority**: gain de temps net dès qu'une vague d'inscriptions
suspectes arrive, mais la page Indices (US2) apporte déjà la vue d'ensemble.

**Independent Test**: cocher cinq comptes factices dont un déjà vérifié et un
déjà invité, lancer « inviter au selfie » : trois invitations posées, deux
ignorées avec leur raison, trois lignes de journal identiques à celles du
geste unitaire.

**Acceptance Scenarios**:

1. **Given** N comptes cochés, **When** le modérateur lance « inviter au selfie » et confirme, **Then** chaque compte non vérifié et non encore invité reçoit l'invitation, avec une ligne de journal par compte identique à celle du geste unitaire.
2. **Given** N comptes cochés, **When** le modérateur lance « exiger une vérification » et confirme, **Then** chaque compte non vérifié est mis en retrait comme par la décision unitaire de la file, avec une ligne de journal par compte.
3. **Given** un lot qui contient le compte du modérateur lui-même ou un compte déjà vérifié, **Then** ces comptes sont ignorés et le bilan le dit.
4. **Given** une panne en cours de lot, **Then** les comptes déjà traités le restent, le bilan indique lesquels n'ont pas été traités, et relancer le même lot ne double rien.
5. **Given** des comptes cochés dans des grappes différentes dont l'un n'est pas « douteux », **Then** le geste « exiger une vérification » n'est pas proposé, seule l'invitation l'est.
6. **Given** un lot de plus de 50 comptes, **Then** le geste est refusé avec un message qui invite à le découper.

---

### User Story 4 - Un seul point d'entrée « Modération » (Priority: P2)

La navigation d'administration regroupe sous une entrée « Modération » les
surfaces qui demandent une décision humaine : Indices, Signalements,
Vérifications (selfies), Retours. L'outil Photos (recherche d'une photo
ailleurs, métadonnées) n'est pas une page : il reste accessible depuis chaque
carte qui montre des photos (grappe, selfie, fiche). Chaque sous-page porte un repère de
présence quand elle a du travail en attente. Les anciennes adresses des pages
fusionnées ou déplacées redirigent vers leur nouvel emplacement.

**Why this priority**: rangement. Il rend l'outil plus rapide à parcourir mais
ne change aucune décision.

**Independent Test**: depuis l'accueil d'administration, atteindre chacune des
quatre surfaces en deux clics au plus ; ouvrir l'ancienne adresse de la file
« Profils à vérifier » et arriver sur la page Indices.

**Acceptance Scenarios**:

1. **Given** l'accueil d'administration, **When** l'opérateur ouvre « Modération », **Then** il voit les quatre surfaces et, pour chacune, si du travail attend.
2. **Given** un ancien lien vers une page déplacée, **When** il est ouvert, **Then** il mène à la nouvelle page sans erreur.
3. **Given** la fusion, **Then** chaque geste disponible avant (trancher, inviter, exiger, bannir, voir les photos) reste disponible.
4. **Given** la liste des membres filtrée sur « à surveiller » et triée, **When** le modérateur ouvre une fiche puis revient en arrière, **Then** la liste s'affiche avec le même filtre, le même tri et la même page.

---

### User Story 5 - Ne plus créer de doublon par faute de frappe (Priority: P2)

À l'inscription, la personne saisit son adresse deux fois ; un domaine
probablement mal orthographié déclenche une suggestion non bloquante
(« Tu voulais dire gmail.com ? »). Après l'inscription, l'écran qui l'invite à
ouvrir sa boîte affiche l'adresse saisie. Si elle constate une erreur, ou si
elle tente plus tard de se connecter avec un compte non vérifié, elle peut
corriger l'adresse de **ce** compte (en prouvant qu'elle connaît son mot de
passe) et recevoir le lien à la bonne adresse, sans créer de second compte.

**Why this priority**: tarit la source des doublons. Moins urgent que de les
traiter (US2), car la base actuelle en contient déjà.

**Independent Test**: s'inscrire avec « prenom@gmial.com » : la suggestion
apparaît ; deux saisies différentes bloquent l'envoi. Après inscription avec
une adresse fautive, corriger l'adresse depuis l'écran d'attente avec le mot de
passe : le lien part à la nouvelle adresse, l'ancienne n'est plus associée au
compte, et un seul compte existe.

**Acceptance Scenarios**:

1. **Given** le formulaire d'inscription, **When** les deux adresses saisies diffèrent, **Then** l'envoi est impossible et un message en phrase complète l'explique.
2. **Given** une adresse dont le domaine ressemble à un domaine courant mal orthographié, **When** la personne quitte le champ, **Then** une suggestion s'affiche, qu'elle peut accepter d'un geste ou ignorer ; l'inscription reste possible dans les deux cas.
3. **Given** l'écran « vérifie ta boîte » après inscription, **Then** l'adresse saisie y est affichée en entier, avec la règle des 30 jours et sa raison.
4. **Given** un compte jamais vérifié, **When** sa propriétaire saisit son mot de passe et une nouvelle adresse, **Then** l'adresse du compte est remplacée, un nouveau lien part à la nouvelle adresse et l'ancien lien cesse de fonctionner.
5. **Given** une nouvelle adresse déjà utilisée par un autre compte, **Then** la correction est refusée avec le même message neutre que l'inscription, sans révéler l'existence de l'autre compte au-delà de ce qu'elle révèle déjà.
6. **Given** un compte déjà vérifié, **Then** la correction d'adresse par ce chemin n'est pas proposée.

---

### User Story 6 - Durée de vie des comptes et vue des comptes actifs (Priority: P3)

Deux règles rejoignent la source unique des durées de conservation, la
politique de confidentialité et la page d'administration de la rétention :

- un compte dont l'adresse n'a **jamais été vérifiée** est supprimé **30 jours**
  après sa création ;
- un compte vérifié **sans présence depuis 1 an** est supprimé, après un
  **e-mail de préavis envoyé 30 jours avant** ; une présence pendant le préavis
  annule la suppression.

Comme les autres règles, la purge se déclenche par le trafic, sans tâche
planifiée. Les statistiques d'administration montrent une répartition des
comptes par fraîcheur de présence (moins de 7 jours, moins de 30 jours, moins
de 6 mois, moins d'un an, plus d'un an, jamais vérifiés), et le nombre de
comptes en préavis.

**Why this priority**: assainit la base et les chiffres à terme ; dépend de
US1, et la première suppression pour inactivité ne peut pas intervenir avant
qu'une année de mesure de présence se soit écoulée (voir Assumptions).

**Independent Test**: sur une base factice, un compte non vérifié créé il y a
31 jours est supprimé au passage de purge ; un compte vérifié vu il y a
336 jours reçoit le préavis ; vu il y a 366 jours avec préavis envoyé il y a
plus de 30 jours, il est supprimé ; un compte en préavis qui revient ne l'est
pas.

**Acceptance Scenarios**:

1. **Given** un compte jamais vérifié créé il y a plus de 30 jours, **When** la purge passe, **Then** le compte et ses données sont supprimés et le bilan de purge le compte.
2. **Given** un compte vérifié dont la dernière présence date de 335 jours ou plus et sans préavis, **When** la purge passe, **Then** un e-mail de préavis part et la date du préavis est retenue.
3. **Given** un compte en préavis depuis 30 jours ou plus et toujours absent, **When** la purge passe, **Then** le compte est supprimé.
4. **Given** un compte en préavis, **When** son propriétaire revient, **Then** le préavis est levé et le compte n'est pas supprimé.
5. **Given** un compte en retrait avec un selfie en cours d'examen, ou visé par un signalement ouvert, **Then** aucune des deux règles ne le supprime tant que la décision n'est pas prise.
6. **Given** la politique de confidentialité, **Then** les deux durées y figurent, et un test échoue si une durée est promise sans purge ou purgée sans promesse.
7. **Given** un compte vérifié sans présence depuis plus de 3 mois, **When** un autre membre parcourt Découvrir, **Then** ce compte n'y figure pas ; **When** il revient, **Then** il y figure de nouveau.
8. **Given** la répartition par fraîcheur dans les statistiques, **Then** toute case inférieure à 5 s'affiche « < 5 ».

---

### Edge Cases

- **Grappe de plus de deux comptes** (famille partageant une tablette, rafale d'inscriptions depuis une même connexion) : la grappe montre tous les comptes ; elle n'est jamais classée « doublon probable » si plus d'un compte est vérifié.
- **Doublon dont aucun compte n'est vérifié** : pas de classement « doublon probable » ni de suppression en un geste ; la règle des 30 jours s'en chargera.
- **Doublon dont l'orphelin a une activité** (photo, likes, messages) : impossible pour un compte jamais vérifié qui ne peut pas se connecter ; si le cas se présente malgré tout, le geste rapide est refusé et le modérateur passe par la fiche.
- **Membre banni** : la purge d'inactivité ne doit pas effacer les empreintes retenues au bannissement, qui suivent leur propre règle.
- **E-mail de préavis non délivré** : la suppression suit tout de même 30 jours après l'envoi ; l'échec d'envoi est journalisé sans adresse.
- **Compte de modérateur ou d'administrateur inactif** : exclu de la suppression automatique.
- **Correction d'adresse répétée** : limitée en fréquence comme les autres envois d'e-mail, pour empêcher l'usage du formulaire comme relais d'envoi.
- **Lien de vérification envoyé à l'ancienne adresse** : invalidé par la correction, pour qu'une tierce personne qui le recevrait ne puisse pas vérifier le compte.
- **Indice lié à un compte déjà supprimé** : la grappe montre « compte supprimé » à sa place, sans erreur.

## Requirements *(mandatory)*

### Functional Requirements

**Présence (US1)**

- **FR-001**: Le système DOIT retenir, pour chaque compte, la date du dernier jour où le membre a utilisé l'app connectée, au jour près, sans historique des visites.
- **FR-002**: Le système DOIT écrire cette date au plus une fois par jour et par compte.
- **FR-003**: Les statistiques d'administration « actifs 7 j », « actifs 30 j » et « revenus après le premier jour », ainsi que le tri par activité de « Pour toi », DOIVENT se fonder sur cette date.
- **FR-004**: La politique de confidentialité DOIT mentionner cette donnée et sa finalité.

**Page Indices (US2)**

- **FR-005**: Le système DOIT offrir aux modérateurs une page qui liste les comptes portant au moins un indice non tranché.
- **FR-006**: Le système DOIT regrouper en grappe les comptes reliés par un indice de lien (appareil partagé, même connexion à l'inscription, photo réutilisée, texte réutilisé).
- **FR-007**: Chaque grappe DOIT afficher, en phrases complètes, la ou les raisons du soupçon, avec l'écart de temps entre les inscriptions lorsqu'il est pertinent.
- **FR-008**: Chaque grappe DOIT présenter ses comptes côte à côte avec : date d'inscription, adresse vérifiée ou non, présence d'une photo, dernière présence, niveau de fiabilité, état de vérification.
- **FR-009**: Le système DOIT classer « doublon probable » une grappe de deux comptes liés par le même appareil dont exactement un a vérifié son adresse, et DOIT offrir un filtre sur ce classement.
- **FR-010**: Le modérateur DOIT pouvoir supprimer, après confirmation, le compte jamais vérifié d'un doublon probable ; l'action DOIT être journalisée (modérateur, compte, motif « doublon ») et trancher les indices de la grappe.
- **FR-011**: Le modérateur DOIT pouvoir trancher une grappe « rien à signaler » ; ses indices suivent alors la règle de conservation existante des dossiers clos sans suite.
- **FR-012**: Chaque compte d'une grappe DOIT mener à sa fiche détaillée existante.
- **FR-013**: La page Indices REMPLACE la file « Profils à vérifier » : le détail d'une grappe DOIT offrir toutes les décisions de la file (rien à signaler, exiger la vérification, bannir) et l'analyse des photos, avec les mêmes effets et le même journal ; l'adresse de l'ancienne file DOIT rediriger vers la page Indices.

**Actions par lot (US3)**

- **FR-014**: Le modérateur DOIT pouvoir sélectionner plusieurs comptes et leur appliquer l'invitation au selfie (sans retrait) ou l'exigence de vérification (avec retrait).
- **FR-015**: Chaque geste par lot DOIT produire, pour chaque compte traité, exactement le même effet et la même ligne de journal que le geste unitaire correspondant.
- **FR-016**: Un geste par lot DOIT être idempotent par compte et DOIT rendre un bilan : comptes traités, comptes ignorés avec leur raison, comptes en échec.
- **FR-017**: Un lot DOIT être limité à 50 comptes et exiger une confirmation qui rappelle le nombre de comptes et l'effet du geste.
- **FR-018**: L'exigence de vérification avec retrait par lot NE DOIT être proposée que si tous les comptes cochés appartiennent à une même grappe ou sont de niveau « douteux » ; sa confirmation DOIT lister nominativement chaque compte concerné. L'invitation au selfie par lot n'a pas cette restriction.

**Navigation (US4)**

- **FR-019**: L'administration DOIT offrir une entrée « Modération » qui regroupe Indices, Signalements, Vérifications et Retours (l'outil Photos restant attaché aux cartes qui montrent des photos), chacune avec un repère de présence quand du travail attend.
- **FR-020**: Toute adresse d'administration déplacée ou fusionnée DOIT rediriger vers son nouvel emplacement.
- **FR-021**: Aucun geste de modération existant ne DOIT disparaître à l'occasion du regroupement.
- **FR-022**: Les filtres, tris, recherches et numéros de page des listes d'administration (membres, Indices, signalements, vérifications, retours) DOIVENT être portés par l'adresse de la page : un retour arrière depuis une fiche, un rechargement ou un lien partagé rendent la liste dans le même état.

**Inscription (US5)**

- **FR-023**: Le formulaire d'inscription DOIT demander l'adresse deux fois et refuser l'envoi si les deux saisies diffèrent (comparaison sans tenir compte de la casse ni des espaces en bordure).
- **FR-024**: Le formulaire DOIT suggérer, sans bloquer, la correction d'un domaine proche d'un domaine courant, à partir d'une liste locale et sans appel réseau.
- **FR-025**: L'écran qui suit l'inscription DOIT afficher l'adresse saisie et proposer de la corriger.
- **FR-026**: La propriétaire d'un compte jamais vérifié DOIT pouvoir remplacer son adresse en prouvant la connaissance du mot de passe, depuis l'écran qui suit l'inscription et depuis l'écran de connexion lorsqu'il refuse un compte non vérifié.
- **FR-027**: La correction DOIT invalider tout lien de vérification envoyé à l'ancienne adresse, envoyer un nouveau lien à la nouvelle, et être limitée en fréquence.
- **FR-028**: La correction DOIT être refusée pour un compte déjà vérifié et pour une adresse déjà utilisée, avec un message qui n'en apprend pas plus que l'inscription.

**Durée de vie des comptes (US6)**

- **FR-029**: Le système DOIT supprimer un compte dont l'adresse n'a jamais été vérifiée 30 jours après sa création.
- **FR-030**: Aucun e-mail de relance NE DOIT précéder la suppression d'un compte jamais vérifié. La règle (« sans confirmation de ton adresse sous 30 jours, ton inscription est effacée ») DOIT être annoncée en phrase complète sur le formulaire d'inscription, sur l'écran « vérifie ta boîte » et sur le refus de connexion d'un compte non vérifié, avec sa raison : garder une communauté à jour, faite de vraies personnes joignables.
- **FR-031**: Le système DOIT envoyer un e-mail de préavis à un compte vérifié sans présence depuis 335 jours, et le supprimer 30 jours après le préavis s'il n'est pas revenu entre-temps.
- **FR-032**: Une présence pendant le préavis DOIT annuler la suppression programmée.
- **FR-033**: Les deux règles DOIVENT épargner les comptes visés par une décision de modération en attente (selfie en cours d'examen, signalement ouvert) et les comptes de modérateur ou d'administrateur.
- **FR-034**: Les deux règles DOIVENT figurer dans la source unique des durées de conservation, dans la politique de confidentialité et dans la page d'administration de la rétention, et se déclencher comme les autres purges, par le trafic.
- **FR-035**: L'e-mail de préavis DOIT dire en phrases complètes ce qui va se passer, quand, et comment l'éviter (revenir sur Libre), sans nom ni contenu d'aucun autre membre.
- **FR-036**: Un compte sans présence depuis 3 mois DOIT être absent des listes de Découvrir (« Pour toi », « À proximité ») ; il y réapparaît dès sa prochaine présence. Aucune autre donnée n'est modifiée, et le membre n'en est pas notifié.
- **FR-037**: Les statistiques d'administration DOIVENT montrer la répartition des comptes par fraîcheur de présence et le nombre de comptes en préavis, toute case inférieure à 5 affichée « < 5 ».

**Transverses**

- **FR-038**: Toute nouvelle donnée de compte introduite par cette spec (date de présence, date de préavis) DOIT rester privée : jamais dans une réponse lue par un autre membre ni dans une charge utile de notification.
- **FR-039**: Toute la copie, côté membre comme côté administration, DOIT être en français, en phrases complètes, avec les composants et jetons du design system.

### Key Entities *(include if feature involves data)*

- **Présence d'un compte** : dernier jour d'utilisation de l'app connectée, une date par compte, sans historique. Privée.
- **Préavis d'inactivité** : date d'envoi de l'e-mail de préavis, levée par une présence. Privée.
- **Grappe d'indices** : ensemble de comptes reliés par au moins un indice de lien non tranché ; **dérivée** à la lecture à partir des indices existants, jamais stockée. Porte un classement éventuel « doublon probable ».
- **Indice** (existant) : signal levé sur un compte, avec éventuellement le compte lié et la clé du lien.
- **Ligne de journal de modération** (existante) : une par compte et par geste, y compris dans un lot.
- **Règle de conservation** (existante) : deux nouvelles entrées, « compte jamais vérifié » et « compte inactif ».

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Le modérateur comprend pourquoi une grappe est suspecte et décide sans ouvrir de fiche dans au moins 80 % des grappes, et chaque décision sur un doublon probable prend moins de 30 secondes.
- **SC-002**: Les doublons de bonne foi présents à la livraison sont tous traités en une seule séance de modération.
- **SC-003**: Inviter ou exiger une vérification pour 20 comptes prend moins d'une minute, contre 20 allers-retours aujourd'hui.
- **SC-004**: Dans les 30 jours qui suivent la livraison de US5, le nombre de nouveaux doublons probables est inférieur à 5 (mesuré par agrégat).
- **SC-005**: Trois mois après la livraison de US1, l'écart entre « actifs 7 j » et « revenus après J+1 » ne peut plus s'expliquer par la seule mesure : un membre qui revient sans rien modifier est compté.
- **SC-006**: 30 jours après la livraison de US6, plus aucun compte jamais vérifié de plus de 30 jours ne subsiste en base.
- **SC-007**: Chaque surface de modération est atteignable en deux clics au plus depuis l'accueil d'administration, et aucun ancien lien ne mène à une erreur.
- **SC-008**: Après un aller-retour vers une fiche membre, aucune liste d'administration ne demande de refaire un filtre.

## Assumptions

- Les données de membres n'entrent jamais dans le contexte d'un agent IA : développement et tests sur base factice, mesures par agrégats (cases < 5 masquées). La page Indices est une surface d'opérateur, consultée par l'opérateur lui-même.
- La présence se mesure sur les requêtes authentifiées de l'app ; une visite non connectée ne compte pas.
- Les comptes vérifiés existants n'ont pas de date de présence à la livraison de US1. On l'initialise à la date de livraison : aucun compte ne peut donc recevoir de préavis d'inactivité avant 335 jours après la livraison de US1. La règle « 1 an » est livrée (politique, code, tests) mais ne s'appliquera de fait qu'à partir de cette date.
- Les comptes jamais vérifiés existants de plus de 30 jours sont supprimés au premier passage de purge suivant la livraison de US6 ; la politique de confidentialité est mise à jour dans la même livraison.
- La suppression d'un compte suit le chemin de suppression de compte existant (cascade), y compris pour le doublon et l'inactivité ; les empreintes retenues au bannissement suivent leur propre règle.
- Les deux gestes de vérification existent déjà à l'unité (invitation #511, exigence via la décision de la file) ; le lot les réutilise sans nouvelle sémantique.
- La « même connexion à l'inscription » ne relie des comptes que pendant les 7 jours de conservation de sa trace ; au-delà, le lien disparaît de la page.
- La liste locale de domaines courants couvre au minimum les fournisseurs de messagerie les plus utilisés en France (gmail, hotmail, outlook, live, yahoo, orange, free, sfr, laposte, icloud, wanadoo, gmx, protonmail).
- L'envoi d'e-mail de préavis réutilise le canal d'e-mail transactionnel existant (vérification, réinitialisation).
- Hors périmètre : la suppression de compte à la demande du membre (#160), les indicateurs de risque sur la messagerie (#370), le signal d'origine atypique (#513).
- La page Indices passe par un prototype validé par l'opérateur avant tout code (gate visuel).
