# Feature Specification: Où en est Libre — journal d'avancement (MVP)

**Feature Branch**: `docs/007-journal`

**Created**: 2026-09-24

**Status**: Draft

**Input**: User description: "Spec 007 « Où en est Libre » — MVP du journal d'avancement (épique #350, lot #351). Une page publique, indexable, où l'équipe publie des nouvelles datées : mises à jour du service, conseils pour ne pas se faire arnaquer, moments de la communauté (ex. fêter les 100 inscrits). Rédigée depuis l'admin : brouillon, aperçu, publication, dépublication ; l'opérateur valide le fond et la forme de chaque publication. MVP strict ; réactions, commentaires, sondages, publications réservées aux inscrits, notifications et images renvoyés à une spec suivante. Exigence centrale : le projet est open source et le dépôt public, le contenu publié ne doit donner aucune piste à un attaquant — garde-fous à la rédaction (règles écrites, contrôle automatique du brouillon, alertes à lever une à une, liste des règles à cocher), pas une page privée. Conseils anti-arnaque côté victime, jamais côté détection. Chiffres communautaires en ordre de grandeur arrondi, jamais de statistiques de modération."

## Contexte

Libre démarre. Les premiers inscrits arrivent par le référencement naturel,
trouvent un service jeune et n'ont nulle part où lire ce qui se passe : ce qui
vient d'arriver, ce qui vient ensuite, comment se protéger. La Place ne peut pas
jouer ce rôle : elle est éphémère par conception (tout y est effacé chaque
jour) et c'est un salon de jeu, pas un canal d'information (cf. épique #350).

Le contenu qui intéresse le plus les inscrits est aussi celui qui intéresse le
plus un attaquant : « on a amélioré la détection des faux profils », « on a
corrigé un problème sur les photos ». Le code de Libre est public ; un journal
qui dirait en plus *ce qui* a changé, *quand* et *comment* le repérer
transformerait chaque nouvelle en mode d'emploi. L'opérateur a tranché
(2026-09-24) : la page reste publique, mais **la rédaction porte des
garde-fous**. On dit ce que le membre y gagne, jamais comment ça marche.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Lire les nouvelles de Libre (Priority: P1)

Une personne — inscrite ou simple visiteuse arrivée par un moteur de
recherche — ouvre « Où en est Libre ». Elle voit les publications, la plus
récente en premier, chacune avec son titre, sa date et un extrait. Elle en
ouvre une et la lit en entier. Rien ne demande de compte.

**Why this priority**: c'est la raison d'être de la page. Sans lecture
publique, il n'y a rien à rédiger.

**Independent Test**: publier une nouvelle (même insérée à la main), ouvrir la
page sans être connecté, JavaScript désactivé : la liste et la publication se
lisent en entier.

**Acceptance Scenarios**:

1. **Given** trois publications publiées et un brouillon, **When** un visiteur
   anonyme ouvre la page, **Then** il voit les trois publications, de la plus
   récente à la plus ancienne, et jamais le brouillon.
2. **Given** une publication publiée, **When** un visiteur ouvre son adresse
   directe, **Then** il lit le titre, la date et le corps complet, avec un
   aperçu correct quand le lien est partagé (titre et description propres à la
   publication).
3. **Given** un visiteur anonyme et un membre connecté, **When** chacun ouvre la
   même publication, **Then** le contenu servi par le serveur est identique
   octet pour octet (aucune personnalisation côté serveur).
4. **Given** aucune publication publiée, **When** un visiteur ouvre la page,
   **Then** il voit un état vide qui se tient (une phrase qui dit que les
   nouvelles arrivent), jamais une page cassée ou un compteur à zéro.
5. **Given** une publication dépubliée, **When** un visiteur ouvre son ancienne
   adresse, **Then** il obtient une page « introuvable » ordinaire.

---

### User Story 2 - Rédiger, prévisualiser et publier une nouvelle (Priority: P1)

L'opérateur, depuis l'admin, écrit une nouvelle : titre, corps. Il l'enregistre
en brouillon, la reprend plus tard, la prévisualise exactement comme elle
apparaîtra, puis la publie. Plus tard, il peut la modifier ou la dépublier.

**Why this priority**: sans rédaction, la page reste vide ; c'est le second
pilier du MVP.

**Independent Test**: créer un brouillon, le modifier, le prévisualiser, le
publier, vérifier qu'il apparaît sur la page publique, le dépublier, vérifier
qu'il en disparaît ; chaque publication et dépublication apparaît au journal de
modération.

**Acceptance Scenarios**:

1. **Given** l'écran de rédaction, **When** l'opérateur enregistre un titre et
   un corps, **Then** un brouillon existe, invisible du public.
2. **Given** un brouillon, **When** l'opérateur ouvre l'aperçu, **Then** il voit
   la publication rendue comme sur la page publique (mêmes styles, même
   traitement du texte).
3. **Given** un brouillon qui a passé les garde-fous (US3), **When** l'opérateur
   le publie, **Then** il apparaît sur la page publique avec la date de
   publication, et l'action est tracée au journal de modération.
4. **Given** une publication publiée, **When** l'opérateur la dépublie, **Then**
   elle disparaît de la page publique et l'action est tracée.
5. **Given** une publication publiée, **When** l'opérateur la modifie, **Then**
   la modification repasse par les garde-fous avant d'être visible ; la date de
   publication d'origine est conservée.
6. **Given** un corps qui contient du balisage (HTML, script), **When** il est
   rendu, **Then** il s'affiche comme du texte, jamais interprété.

---

### User Story 3 - Ne rien publier qui aide un attaquant (Priority: P1)

Avant chaque publication, le brouillon est relu automatiquement. Tout motif à
risque est signalé à l'opérateur, qui doit corriger ou lever chaque alerte une à
une, puis confirmer avoir relu la liste des règles éditoriales. Certains motifs
bloquent sans exception.

**Why this priority**: c'est la condition posée par l'opérateur pour que la
page soit publique. Un MVP sans garde-fous ne doit pas être livré.

**Independent Test**: soumettre trois brouillons piégés (un chemin technique,
une adresse e-mail, un identifiant de messagerie externe) : chacun déclenche
l'alerte attendue ; l'adresse e-mail empêche la publication même après
confirmation ; un brouillon propre se publie après la seule confirmation des
règles.

**Acceptance Scenarios**:

1. **Given** un brouillon qui contient une adresse e-mail ou un numéro de
   téléphone, **When** l'opérateur tente de publier, **Then** la publication est
   refusée tant que le motif est présent (alerte bloquante, non levable).
2. **Given** un brouillon qui contient un motif à risque levable (chemin ou nom
   de fichier technique, nom de dépendance ou numéro de version, identifiant de
   type `@pseudo`, lien vers un site hors liste blanche, terme technique de
   détection ou de modération, chiffre associé à des bannissements ou
   signalements), **When** l'opérateur tente de publier, **Then** chaque motif
   est signalé avec l'extrait concerné et la règle qu'il enfreint, et la
   publication reste impossible tant que chaque alerte n'a pas été levée
   explicitement.
3. **Given** un brouillon sans alerte, **When** l'opérateur publie, **Then** il
   doit d'abord cocher qu'il a relu les règles éditoriales ; sans cette case, le
   bouton de publication reste inactif.
4. **Given** une alerte levée puis un corps modifié, **When** l'opérateur tente
   de publier, **Then** le contrôle est rejoué et les levées ne valent que pour
   les extraits inchangés.
5. **Given** l'écran de rédaction, **When** l'opérateur l'ouvre, **Then** les
   règles éditoriales sont visibles en permanence, rédigées en langage courant
   avec un exemple à ne pas faire et sa reformulation.
6. **Given** une publication levée avec alertes, **When** elle est publiée,
   **Then** le journal de modération retient quelles règles ont été levées (pas
   les extraits).

---

### User Story 4 - Trouver la page (Priority: P2)

Un visiteur du site public et un membre connecté trouvent chacun un lien vers
« Où en est Libre » là où ils naviguent déjà. Aucun badge « nouveau », aucun
compteur ne signale une publication récente.

**Why this priority**: la page vaut par ses lecteurs, mais un lien direct
partagé suffit à démarrer ; les points d'entrée peuvent suivre de près.

**Independent Test**: depuis la navigation publique et depuis l'app connectée,
un clic mène à la page ; aucun indicateur de nouveauté n'apparaît après une
publication.

**Acceptance Scenarios**:

1. **Given** un visiteur non connecté sur une page publique, **When** il regarde
   la navigation, **Then** il trouve un lien vers la page.
2. **Given** un membre connecté, **When** il cherche la page depuis l'app,
   **Then** il la trouve en un geste depuis un endroit stable (navigation ou
   paramètres), sans pastille ni compteur.

---

### Edge Cases

- **Brouillon jamais publié puis supprimé** : il disparaît sans trace publique ;
  la suppression d'une publication *déjà publiée* passe par la dépublication.
- **Titre très long, mot sans espace, liste imbriquée** : la page ne défile
  jamais horizontalement, sur téléphone comme sur ordinateur.
- **Lien vers Libre lui-même** : autorisé (liste blanche) ; un lien vers
  n'importe quel autre site est une alerte levable.
- **Faux positif** (« 2 » dans « 2 nouveautés » près de « signalement ») :
  l'opérateur lève l'alerte ; le contrôle signale, il ne juge pas.
- **Nouvelle publiée qui s'avère problématique après coup** : la dépublication
  est immédiate sur la page ; une copie peut subsister dans les caches des
  moteurs — les règles éditoriales le rappellent, c'est pourquoi le contrôle
  se fait *avant*.
- **Deux admins éditent le même brouillon** : la dernière sauvegarde l'emporte
  et l'écran le signale ; acceptable à l'échelle de l'équipe.
- **Chiffre communautaire exact** (« 103 inscrits ») : alerte levable qui
  propose l'ordre de grandeur arrondi (« plus de 100 »).

## Requirements *(mandatory)*

### Functional Requirements

**Lecture publique**

- **FR-001**: Le système DOIT afficher, sans compte, la liste des publications
  publiées, de la plus récente à la plus ancienne, avec titre, date et extrait.
- **FR-002**: Chaque publication publiée DOIT avoir une adresse stable qui
  affiche son titre, sa date et son corps complet.
- **FR-003**: Le contenu textuel de la liste et des publications DOIT être
  lisible sans JavaScript et indexable par les moteurs de recherche.
- **FR-004**: Le contenu servi aux visiteurs NE DOIT dépendre d'aucune
  information de session : la réponse est la même pour tout visiteur, connecté
  ou non, et aucune copie en cache ne peut varier selon l'identité.
- **FR-005**: Chaque publication DOIT fournir un titre et une description
  propres pour l'aperçu de partage.
- **FR-006**: Les brouillons et publications dépubliées NE DOIVENT jamais être
  servis publiquement, ni listés, ni accessibles par leur adresse.
- **FR-007**: La page DOIT respecter le thème choisi (mode clair/sombre et
  habillage) et la largeur de lecture du site, sans défilement horizontal.

**Rédaction**

- **FR-008**: Seuls les administrateurs DOIVENT pouvoir créer, modifier,
  prévisualiser, publier, dépublier et supprimer un brouillon.
- **FR-009**: Le corps DOIT accepter un texte restreint : paragraphes, listes,
  liens, emphase. Tout balisage saisi DOIT être rendu comme du texte, jamais
  interprété.
- **FR-010**: L'aperçu DOIT utiliser exactement le même rendu que la page
  publique.
- **FR-011**: Une publication DOIT porter une indication, sans interface à ce
  stade, précisant si elle accepte des commentaires (préparation de #352 ;
  fermée par défaut). Décision opérateur du 2026-09-24 : quand #352 arrivera,
  les commentaires s'allumeront **aussi** par un interrupteur global dans les
  fonctionnalités de l'admin, **coupé par défaut** ; une publication n'accepte
  de commentaires que si l'interrupteur global **et** son propre réglage sont
  ouverts.
- **FR-012**: Chaque publication, dépublication et modification d'une
  publication publiée DOIT être tracée au journal de modération (auteur, date,
  publication, règles levées le cas échéant).
- **FR-013**: Aucune publication NE DOIT se faire automatiquement (ni
  programmée, ni déclenchée par un événement) dans ce MVP.

**Garde-fous éditoriaux**

- **FR-014**: L'écran de rédaction DOIT afficher en permanence les règles
  éditoriales : ce qu'on ne publie jamais, chacune avec un exemple à éviter et
  sa reformulation acceptable (cf. Règles éditoriales ci-dessous).
- **FR-015**: Avant toute publication (première ou après modification), le
  système DOIT contrôler automatiquement le titre et le corps et signaler chaque
  motif à risque avec l'extrait et la règle concernée.
- **FR-016**: Les adresses e-mail et numéros de téléphone DOIVENT bloquer la
  publication sans possibilité de lever l'alerte.
- **FR-017**: Les autres motifs (chemins et noms de fichiers techniques, noms de
  dépendances ou numéros de version, identifiants de type `@pseudo`, liens hors
  liste blanche, vocabulaire technique de détection ou de modération, chiffres
  associés à des bannissements, signalements ou comptes supprimés, chiffres
  communautaires exacts) DOIVENT déclencher une alerte que l'opérateur lève
  explicitement, une par une.
- **FR-018**: La publication DOIT exiger que l'opérateur coche avoir relu les
  règles éditoriales, à chaque publication.
- **FR-019**: Une levée d'alerte NE DOIT valoir que pour l'extrait exact
  concerné ; toute modification de cet extrait rejoue l'alerte.
- **FR-020**: Le contrôle automatique NE DOIT pas prétendre à l'exhaustivité :
  l'écran rappelle qu'il assiste la relecture sans la remplacer.

**Points d'entrée**

- **FR-021**: La navigation publique DOIT proposer un lien vers la page.
- **FR-022**: L'app connectée DOIT proposer un accès stable à la page, sans
  badge, pastille ni compteur de nouveauté.

**Préparation des commentaires (#352)**

- **FR-023**: Les fonctionnalités de l'admin DOIVENT proposer un interrupteur
  « Commentaires du journal », **coupé par défaut** — y compris sur une
  installation neuve et quand le réglage n'a jamais été touché. Tant que #352
  n'est pas livré, l'interrupteur est présent mais son effet est décrit comme à
  venir ; il ne rend rien visible au public.

### Règles éditoriales *(contenu de FR-014, à reprendre tel quel dans l'écran)*

On dit **ce que le membre y gagne**, jamais **comment ça marche**.

1. **Rien sur la détection ni la modération.** Ni règles, ni seuils, ni
   mots-clés, ni signaux, ni délais, ni outils.
   *À éviter* : « Un profil avec un @ sur sa photo part désormais en vérification. »
   *Plutôt* : « On a renforcé la lutte contre les faux profils. »
2. **Rien de non corrigé, rien avant déploiement.** Une faiblesse ne s'évoque
   qu'une fois corrigée **et** en ligne, et sans dire comment elle s'exploitait.
   *À éviter* : « Les photos gardaient la position GPS ; c'est corrigé demain. »
   *Plutôt* (une fois en ligne) : « Vos photos sont désormais nettoyées de leurs
   informations cachées. »
3. **Aucun nom technique.** Ni route, ni fichier, ni dépendance, ni version.
4. **Aucun chiffre de modération.** Ni bannis, ni signalements, ni comptes
   supprimés, même arrondis.
5. **Personne d'identifiable.** Ni pseudo, ni @identifiant, ni e-mail, ni ville,
   ni date précise d'un incident, ni récit qui permette de reconnaître un cas.
6. **Les conseils anti-arnaque se placent côté victime.** On décrit ce que
   l'arnaqueur *demande* (quitter l'app, payer en coupons prépayés, envoyer de
   l'argent, cliquer un lien), jamais ce que Libre *repère* ou *bloque*.
7. **Les chiffres de la communauté s'arrondissent.** « Plus de 100 inscrits »,
   pas « 103 inscrits ».

### Key Entities

- **Publication** : titre, corps (texte restreint), statut (brouillon ou
  publiée), date de première publication, date de dernière modification, auteur
  (admin), commentaires ouverts ou non (préparation #352, fermé par défaut).
  Une adresse lisible dérivée du titre, stable une fois publiée.
- **Trace de modération** (journal de modération existant) : publication,
  dépublication, modification publiée ; auteur ; règles levées (identifiants de
  règles, jamais les extraits).
- **Règle éditoriale** : identifiant, énoncé, exemple à éviter, reformulation ;
  motifs automatiques associés et caractère bloquant ou levable. Liste versionnée
  avec le code, identique dans l'écran et dans le contrôle.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un visiteur sans compte lit n'importe quelle publication publiée
  en un clic depuis la liste, JavaScript désactivé compris.
- **SC-002**: Pour une même publication, la réponse servie à un visiteur anonyme
  et à un membre connecté est identique dans 100 % des cas vérifiés.
- **SC-003**: Aucune publication ne peut atteindre le public avec une alerte non
  levée, une alerte bloquante présente, ou sans la case des règles cochée
  (0 contournement sur les scénarios d'US3).
- **SC-004**: Chacun des motifs de FR-016 et FR-017 est détecté sur un exemple
  de référence (jeu d'exemples versionné, 100 % de détection sur ce jeu).
- **SC-005**: L'opérateur passe d'un brouillon propre à une publication en ligne
  en moins de 2 minutes.
- **SC-006**: 100 % des publications et dépublications apparaissent au journal
  de modération.
- **SC-007**: Les trois premières publications prévues (une mise à jour, des
  conseils anti-arnaque, le cap des 100 inscrits) passent les garde-fous sans
  alerte bloquante, et leur relecture par l'opérateur ne relève aucune
  infraction aux règles éditoriales.

## Assumptions

- **Nom et adresse** : « Où en est Libre », à une adresse publique courte et
  française ; le libellé exact se fixe au prototype.
- **Une seule adresse** pour tous les lecteurs (recommandation de #350) : la
  couche connectée de #352 viendra s'y greffer côté navigateur, ce qui impose
  dès maintenant FR-004.
- **Auteur affiché** : « L'équipe Libre », jamais le nom d'un admin.
- **Liste blanche de liens** : les pages du site lui-même seulement ; tout autre
  lien est une alerte levable (ex. un article de presse, une page officielle
  d'aide aux victimes).
- **Vocabulaire technique de détection** : liste courte et versionnée, enrichie
  au fil des publications ; le contrôle assiste, il ne remplace pas la relecture
  (FR-020).
- **Volume** : quelques publications par mois ; pas de pagination nécessaire au
  MVP au-delà d'une limite raisonnable affichée.
- **Chiffre des 100 inscrits** : à vérifier avant publication ; l'ordre de
  grandeur arrondi est la seule forme publiée (règle 7).
- **Le dépôt public reste la principale surface d'exposition** : les garde-fous
  empêchent la page d'*ajouter* des pistes ; ils ne protègent pas ce que le code
  montre déjà. Hors périmètre de cette spec.

## Hors périmètre (spec suivante)

- Réactions et commentaires modérés (#352), sondages (#353). Les commentaires
  dépendront d'un interrupteur global de l'admin, coupé par défaut (cf. FR-011).
- Publications réservées aux inscrits (piste de l'opérateur, écartée pour le
  MVP au profit des garde-fous).
- Abonnement, notification push ou e-mail d'une nouvelle publication.
- Images, catégories, étiquettes, flux RSS, publication programmée.
- Relecture à deux (un admin rédige, un autre valide).

## Dépendances

- Épique #350 et ticket #351 (cadrage opérateur du 2026-08-23).
- Shell public unifié (#273) : navigation publique et conteneur de lecture.
- Journal de modération existant.
- Prototype validé avant tout code d'interface (constitution, principe V).
