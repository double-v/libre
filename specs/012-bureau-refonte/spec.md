# Feature Specification: Refonte du bureau de modération et vérification par code manuscrit

**Feature Branch**: `docs/012-bureau-refonte`

**Created**: 2026-11-11

**Status**: Draft

**Input**: User description: "Spec 012 — Refonte du back-office de Libre (bureau de modération). Prototype validé par l'opérateur (version 3, copie `proto-bureau.html`). Trois volets : (1) vérification par selfie avec code manuscrit tiré par le serveur au lieu d'un geste, motifs de refus fermés, OCR indicatif, boucle de nouvel essai après refus ; (2) back-office mobile d'abord : Membres comme hub de modération (filtres, tri, recherche, fiche avec gestes guidés « le membre verra » et repères), aucune impasse pour le membre sauf bannissement, gestes optimistes avec annulation et envoi groupé, prêt pour un 2e modérateur ; (3) tableau d'activité narratif aux couleurs de la charte (chapitres qui arrive / qui est là / qui reste / qui se parle / qui sont-ils / prendre soin). Toute la surface admin actuelle reprise. Contrainte Vercel Hobby."

## Contexte

L'opérateur modère seul. Trois difficultés l'ont amené à demander cette refonte
le 2026-11-11 :

1. **Le geste du selfie (#436) demande une interprétation.** « Deux doigts près
   de la joue » ou « regard vers le haut » se jugent à l'œil, sur une photo
   souvent floue, et un générateur d'images reproduit sans peine un geste
   simple. La question posée au modérateur doit devenir fermée.
2. **Le back-office est éclaté et daté.** Quatorze entrées de menu, une file par
   type de cas, une fiche membre séparée des cas qui le concernent. Pour juger
   un signalement, il faut ouvrir trois pages. L'interface n'est pas pensée pour
   le téléphone, alors que l'opérateur modère souvent depuis le sien.
3. **Le tableau de bord aligne des compteurs.** Il dit combien, jamais qui ni
   où ça bloque. Or ces chiffres sont des personnes : le tableau doit raconter
   leur parcours, dans la charte de Libre.

Le prototype validé (`proto-bureau.html`, dans ce dossier) fait foi pour le
visuel. Cette spec en fixe le comportement.

**Relation avec la spec 011** (PR #527, en brouillon) : la page Indices
(US2, livrée) est absorbée par le hub Membres ; l'entrée « Modération »
unique (US4, #524) est remplacée par la navigation de cette spec, dont elle
reprend l'exigence des filtres portés par l'adresse. Les US1, US3, US5 et US6
de la 011 restent valides et indépendantes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Selfie avec un code écrit à la main (Priority: P1)

Un membre qui demande le badge reçoit un code de quatre chiffres tiré par le
serveur, valable 30 minutes. Il l'écrit à la main sur une feuille, avec le mot
« Libre », et prend un selfie en la tenant près de son visage, ou en la posant
à côté de lui s'il ne peut pas la tenir. Côté modération, la carte du selfie
montre le code attendu en grand, le code lu automatiquement sur la photo à titre
d'indice (caractères divergents soulignés, ou « lecture impossible »), les
photos du profil, et trois questions fermées. « Tout est bon, valider » donne
le badge ; « Refuser » oblige à choisir un motif dans une liste fermée.

**Why this priority**: c'est la brique anti-faux-profils (#436). Une question
fermée rend la décision rapide, reproductible d'un modérateur à l'autre, et
plus coûteuse à contrefaire qu'un geste.

**Independent Test**: un membre de test demande un code, envoie un selfie ; le
modérateur voit le code attendu, l'indice de lecture et les trois questions,
valide ou refuse avec un motif ; le statut du membre change en conséquence.

**Acceptance Scenarios**:

1. **Given** un membre non vérifié, **When** il ouvre la vérification, **Then** il voit un code de quatre chiffres, sa durée de validité et les consignes en phrases complètes, dont l'alternative « pose-la à côté de toi » et « quelqu'un peut l'écrire pour toi ».
2. **Given** un selfie envoyé avec un code expiré ou appartenant à un autre membre, **When** le serveur le reçoit, **Then** il le refuse avant toute mise en file et propose un nouveau code.
3. **Given** un selfie en file, **When** le modérateur l'ouvre, **Then** il voit le code attendu, le résultat de la lecture automatique présenté comme un indice, les photos publiées du profil et les trois questions (code manuscrit et exact, même personne, vraie photo).
4. **Given** la lecture automatique a trouvé exactement le code, **When** le modérateur ne fait rien, **Then** aucune décision n'est prise : la lecture ne valide jamais seule.
5. **Given** le modérateur choisit « Refuser », **When** il n'a pas choisi de motif, **Then** le refus ne peut pas être confirmé.

---

### User Story 2 - Après un refus, toujours une suite (Priority: P1)

Un membre dont le selfie est refusé est prévenu par un repère de présence dans
Paramètres (et une notification s'il les a activées). La page de vérification
lui montre le motif, un conseil lié à ce motif, et un nouveau code avec le
bouton « Refaire mon selfie ». Il peut réessayer aussitôt.

**Why this priority**: l'opérateur l'a posé comme règle : aucune impasse dans
les parcours de modération, sauf le bannissement. Un refus sans suite
décourage précisément les vraies personnes qu'on veut vérifier.

**Independent Test**: refuser le selfie d'un membre de test, vérifier qu'il voit
motif, conseil et nouveau code, puis qu'un second envoi revient dans la file
avec la mention « tentative n° 2 » et le motif précédent.

**Acceptance Scenarios**:

1. **Given** un selfie refusé pour « code illisible », **When** le membre ouvre la vérification, **Then** il lit le motif tel que dans la liste fermée, le conseil associé et un nouveau code, sans saisie libre du modérateur.
2. **Given** un second envoi, **When** le modérateur l'ouvre, **Then** la carte indique le numéro de tentative et le motif du refus précédent.
3. **Given** un membre qui a atteint la limite de refus consécutifs, **When** il ouvre la vérification, **Then** il voit la date à laquelle il pourra réessayer, jamais un refus définitif.
4. **Given** trois refus consécutifs, **When** le membre veut un nouveau code, **Then** il pourra le tirer 24 heures après le troisième refus ; une validation remet le compteur à zéro.

---

### User Story 3 - Membres, le point d'entrée de la modération (Priority: P1)

L'écran Membres devient le hub : une recherche (pseudo ou e-mail), des filtres
(À traiter, Selfies, Signalés, Photos, Réponses, Indices, Douteux, Vérifiés,
Masqués, Bannis, Non confirmés, Tous) avec un compteur sur les filtres de
travail, et un tri (urgence, inscription récente, fiabilité). Chaque ligne
montre l'avatar, l'inscription, la dernière visite, une bande de gravité et une
étiquette par cas en attente. Sur téléphone : la liste, puis la fiche en plein
écran avec un retour. Sur grand écran : la liste et la fiche côte à côte.

**Why this priority**: c'est le changement de structure qui rend tout le reste
rapide. Un cas se juge avec tout le contexte du membre, sur un seul écran.

**Independent Test**: depuis un téléphone, filtrer « Signalés », ouvrir un
membre, revenir : le filtre et la position sont conservés, y compris après un
rechargement ou via un lien partagé.

**Acceptance Scenarios**:

1. **Given** des cas de plusieurs types en attente, **When** le modérateur ouvre Membres avec le filtre « À traiter » et le tri par urgence, **Then** les signalements viennent avant les selfies, photos et réponses, puis les indices.
2. **Given** un filtre, une recherche et un tri choisis, **When** le modérateur ouvre une fiche puis revient, recharge ou partage le lien, **Then** la liste revient dans le même état.
3. **Given** un écran de moins de 900 px de large, **When** le modérateur choisit un membre, **Then** la fiche remplace la liste et un bouton « ← Membres » y ramène ; aucun défilement horizontal.
4. **Given** une liste plus longue qu'une page, **When** le modérateur arrive en bas, **Then** la suite se charge sans changer d'écran.

---

### User Story 4 - La fiche membre et ses gestes guidés (Priority: P1)

La fiche réunit, dans l'ordre : l'identité (badges vérifié, statut,
fiabilité), les cas à traiter (selfie, signalement, photo, réponse, indice), les
signaux de fiabilité, les photos publiées avec « Voiler » et « Retirer »,
l'historique (qui a fait quoi, y compris les actions automatiques), les autres
gestes (inviter au selfie, avertir, masquer, débannir), et une zone sensible
repliée (bannir, supprimer). Chaque cas affiche un **repère** d'une phrase pour
décider. Chaque geste qui demande une confirmation affiche **« Le membre
verra… »**. Bannir et supprimer exigent un motif choisi dans une liste et une
confirmation.

**Why this priority**: c'est ce qui permet à une deuxième personne de modérer
sans formation longue, et à l'opérateur de décider sans ouvrir d'autre page.

**Independent Test**: traiter depuis la seule fiche un signalement, une photo
avec texte détecté, une réponse avec contact et un doublon ; chaque décision a
le même effet et la même ligne de journal qu'avec les pages actuelles.

**Acceptance Scenarios**:

1. **Given** un signalement pour demande d'argent, **When** le modérateur l'ouvre, **Then** il voit le contenu signalé, le nombre de signalements, les signaux du compte, le repère « une demande d'argent suffit pour bannir » et les gestes Sans suite, Avertir, Masquer, Bannir.
2. **Given** un indice « doublon probable », **When** le modérateur ouvre la fiche, **Then** le compte lié s'affiche et s'ouvre d'un geste, et « Supprimer » vise le compte jamais confirmé.
3. **Given** un geste Bannir, **When** le modérateur le choisit, **Then** une confirmation demande le motif et dit ce que le membre verra ; sans confirmation, rien n'est fait.
4. **Given** les pages actuelles Signalements, Vérifications, Indices et Profils à vérifier, **When** un ancien lien est ouvert, **Then** il mène au hub Membres filtré sur le type correspondant.

---

### User Story 5 - Des gestes instantanés, sûrs à deux (Priority: P2)

Un geste met l'écran à jour tout de suite et affiche « Annuler » pendant 5
secondes. Passé ce délai, les gestes partent par lots. Un indicateur dit en
permanence combien de gestes attendent l'envoi. Quand la fiche n'a plus de
cas, « Cas suivant » ouvre le membre suivant à traiter. Un cas déjà tranché par
un autre modérateur est signalé « déjà traité » sans bloquer les autres
gestes du lot ; un cas ouvert par un autre modérateur affiche son nom.

**Why this priority**: la vitesse de traitement est l'objectif de l'opérateur ;
la sûreté à deux prépare l'arrivée d'un second modérateur.

**Independent Test**: trancher trois cas en moins de 15 secondes, en annuler
un, couper le réseau, trancher un quatrième, rétablir le réseau ; vérifier que
seuls les trois gestes voulus sont appliqués, chacun une seule fois.

**Acceptance Scenarios**:

1. **Given** un geste annulé dans les 5 secondes, **When** le délai passe, **Then** rien n'est envoyé et l'écran revient à l'état d'avant.
2. **Given** un lot renvoyé après une coupure, **When** le serveur le reçoit une seconde fois, **Then** aucun geste n'est appliqué deux fois.
3. **Given** deux modérateurs sur le même signalement, **When** le second tranche après le premier, **Then** son geste est refusé pour ce cas avec « déjà traité par X », et l'écran affiche la décision retenue.
4. **Given** des gestes encore dans leur délai d'annulation, **When** le modérateur ferme l'onglet, **Then** ils ne partent pas ; à la réouverture, l'écran propose de les envoyer ou de les abandonner. Les gestes dont le délai était écoulé sont envoyés à la fermeture.

---

### User Story 6 - Des sanctions graduées, chacune avec sa suite (Priority: P2)

Entre « sans suite » et « bannir », le modérateur dispose de deux gestes :
**avertir** (le membre lit un message de la modération à sa prochaine
connexion, choisi dans une liste, puis continue normalement) et **masquer**
(le profil sort de Découvrir pendant 3 mois ; le membre voit le motif et la
date de fin, et peut demander une relecture après avoir corrigé son profil,
qui revient dans « À traiter »). Une photo retirée ou voilée, une réponse
retirée, chacune laisse au membre un bandeau qui explique et une action
possible (ajouter une autre photo, écrire une autre réponse).

**Why this priority**: sans gradation, le modérateur hésite entre laisser
passer et bannir. Et la règle « aucune impasse » s'applique à chaque décision.

**Independent Test**: avertir un membre de test, vérifier le message à la
connexion suivante ; le masquer, vérifier son absence de Découvrir, sa vue du
motif, et que sa demande de relecture apparaît dans « À traiter ».

**Acceptance Scenarios**:

1. **Given** un membre averti, **When** il se connecte, **Then** il lit le message une fois, le referme, et continue sans restriction.
2. **Given** un membre masqué, **When** il demande une relecture, **Then** un cas « relecture » apparaît sur sa fiche et dans le filtre « À traiter ».
3. **Given** un masquage arrivé à échéance, **When** la date passe, **Then** le profil revient dans Découvrir sans action du modérateur.

---

### User Story 7 - L'activité de Libre, racontée (Priority: P2)

L'onglet Activité ouvre sur une phrase (« 252 personnes sont passées sur Libre
ces 30 derniers jours. 44 nous ont rejoints… ») et un bloc « Quelques personnes
attendent ton regard » qui mène aux filtres du hub. Il se lit ensuite en
chapitres : **Qui arrive** (un point par personne inscrite, teinté selon
jusqu'où elle est allée ; arrivées par jour), **Qui est là** (personnes
actives par jour, avec des repères pour les billets du journal ; moments de la
semaine où l'on se parle le plus), **Qui reste** (sur dix personnes arrivées
une semaine donnée, combien passent encore), **Qui se parle** (part des
premiers messages qui reçoivent une réponse, messages, matchs, La Place),
**Qui sont-ils** (âges, intentions, genres, état des profils, questions en
miroir, centres d'intérêt), **Prendre soin** (délai de réponse de la
modération, cas traités par semaine, nouveaux essais après un refus de
selfie, décisions), **Côté coulisses** (rétention, limites, fonctionnalités en
pause). Période : semaine, mois ou trimestre. Chaque graphique a une
info-bulle au toucher et un tableau « Voir les chiffres ».

**Why this priority**: le suivi de l'activité guide les choix produit, mais il
n'empêche pas de modérer : il vient après le hub.

**Independent Test**: sur une base de démonstration, chaque chapitre affiche des
chiffres égaux à ceux d'un calcul indépendant pour la même période, et chaque
phrase choisit la bonne tournure (hausse, baisse, stable).

**Acceptance Scenarios**:

1. **Given** la période « Mois », **When** l'onglet s'ouvre, **Then** la phrase d'ouverture, les chapitres et les graphiques portent sur les 30 derniers jours et se comparent aux 30 jours d'avant.
2. **Given** une variation de moins de 3 % sur une mesure, **When** la phrase est rédigée, **Then** elle dit « stable » plutôt qu'une hausse ou une baisse.
3. **Given** un billet du journal publié dans la période, **When** la courbe des personnes actives s'affiche, **Then** un repère porte son titre à sa date.
4. **Given** un lecteur d'écran, **When** il parcourt un graphique, **Then** un libellé le décrit et le tableau des chiffres est atteignable.

---

### User Story 8 - Retours et outils dans la nouvelle navigation (Priority: P3)

La navigation tient en quatre entrées (Activité, Membres, Retours, Outils),
en barre d'onglets sur téléphone et en en-tête sur grand écran. Retours garde
ses règles (une réponse par retour, définitive ; retour anonyme marqué lu) avec
une réponse préremplie quand c'est possible. Outils regroupe : Historique des
actions, Guide de modération, La Place, Alertes Cercle, Journal public,
Fonctionnalités, Apparence, Limites de requêtes, Rétention.

**Why this priority**: c'est la reprise de l'existant dans le nouvel habillage,
sans nouvelle règle.

**Independent Test**: chaque page d'administration actuelle a un équivalent
atteignable en deux gestes au plus depuis l'accueil, et son ancienne adresse
redirige.

**Acceptance Scenarios**:

1. **Given** une ancienne adresse d'administration, **When** elle est ouverte, **Then** elle redirige vers son nouvel emplacement.
2. **Given** le Guide de modération, **When** un nouveau modérateur l'ouvre, **Then** il y lit les mêmes repères que sur les cartes de cas.

### Edge Cases

- Un membre ouvre la vérification sur deux appareils : seul le dernier code tiré est valable.
- La lecture automatique échoue ou n'a pas fini quand le modérateur ouvre le cas : la carte dit « lecture en cours » ou « lecture impossible, lis-le toi-même » ; la décision reste possible.
- Le membre est banni ou supprimé pendant qu'un geste sur lui attend l'envoi : le lot renvoie « cas clos » pour ce geste, sans erreur pour les autres.
- Un modérateur perd la connexion avec des gestes en attente : l'indicateur passe en attente et les gestes repartent au retour du réseau.
- Un compte lié d'un indice a déjà été supprimé : la fiche l'indique et l'indice se tranche « rien à signaler » ou se ferme.
- Une période sans aucune inscription : le chapitre « Qui arrive » le dit en une phrase au lieu d'un graphique vide.
- Une très petite base (dizaines de comptes) : les phrases restent justes au singulier et à zéro (« 1 personne nous a rejoints », « personne ne nous a rejoints »).
- Un membre averti n'ouvre pas l'app pendant des mois : le message l'attend, une seule fois.

## Requirements *(mandatory)*

### Vérification par code manuscrit

- **FR-001**: Le système DOIT tirer, pour chaque demande de vérification, un code de quatre chiffres sans 0 ni 1 (évite la confusion avec O et I), lié au membre et valable 30 minutes ; tirer un nouveau code invalide le précédent.
- **FR-002**: Le système DOIT refuser, avant mise en file, un selfie dont le code est expiré, invalidé ou lié à un autre membre.
- **FR-003**: Les consignes DOIVENT proposer de tenir la feuille ou de la poser à côté de soi, et préciser qu'une autre personne peut écrire le code.
- **FR-004**: Le système DOIT tenter de lire le code sur le selfie après sa réception, sans retarder la réponse au membre, et conserver le résultat (code lu, ou lecture impossible) pour la modération.
- **FR-005**: La lecture automatique NE DOIT JAMAIS valider ni refuser un selfie.
- **FR-006**: La carte de modération DOIT afficher le code attendu, le résultat de la lecture en signalant les caractères divergents, les photos publiées du profil, les trois questions fermées et, à partir de la deuxième tentative, le numéro de tentative et le motif du refus précédent.
- **FR-007**: Les motifs de refus DOIVENT être une liste fermée lue telle quelle par le membre : code absent, illisible ou inexact ; ne correspond pas aux photos du profil ; photo d'écran, retouchée ou générée ; visage peu visible. Chaque motif DOIT avoir un conseil associé.
- **FR-008**: Les demandes en cours sous l'ancien geste DOIVENT rester traitables jusqu'à épuisement ; aucune nouvelle demande n'utilise le geste.
- **FR-009**: Le selfie de vérification DOIT rester hors du profil, visible seulement par son auteur et la modération (règle existante de #436).

### Boucle après refus

- **FR-010**: Un refus DOIT produire un repère de présence dans Paramètres et, si le membre a activé les notifications, une notification sans motif ni contenu.
- **FR-011**: La page de vérification d'un membre refusé DOIT afficher le motif, le conseil et un nouveau code, avec l'action « Refaire mon selfie ».
- **FR-012**: Le système DOIT permettre un nouvel essai immédiat après un refus ; après trois refus consécutifs, le code suivant ne peut être tiré que 24 heures après le dernier refus, et le membre voit cette date. Une validation remet le compteur à zéro.

### Hub Membres

- **FR-013**: Membres DOIT offrir la recherche par pseudo ou e-mail, les filtres listés en US3 et les tris par urgence, inscription récente et fiabilité.
- **FR-014**: Les filtres de travail (À traiter, Selfies, Signalés, Photos, Réponses, Indices) DOIVENT afficher leur nombre de cas ; les autres filtres n'affichent pas de nombre.
- **FR-015**: Le tri par urgence DOIT classer les signalements, puis selfies, photos, réponses et relectures, puis indices, et à gravité égale le cas le plus ancien d'abord.
- **FR-016**: Le filtre, la recherche, le tri et le membre ouvert DOIVENT être portés par l'adresse de la page (reprend FR-022 de la spec 011).
- **FR-017**: La liste DOIT se charger par pages successives, sans numéro de page à choisir.
- **FR-018**: L'affichage DOIT fonctionner dès 360 px de large sans défilement horizontal, avec des cibles tactiles d'au moins 44 px, et passer en deux volets à partir de 900 px.

### Fiche et gestes

- **FR-019**: La fiche DOIT présenter les sections listées en US4, dans cet ordre.
- **FR-020**: Chaque type de cas DOIT afficher un repère de décision d'une phrase ; le Guide de modération DOIT reprendre les mêmes repères depuis une source unique.
- **FR-021**: Chaque geste confirmé DOIT afficher « Le membre verra… » avec le texte réel de ce que verra le membre.
- **FR-022**: Bannir et supprimer DOIVENT exiger un motif choisi dans une liste fermée et une confirmation explicite.
- **FR-023**: Chaque geste du hub DOIT produire exactement l'effet et la ligne de journal du geste équivalent des pages actuelles ; aucun geste existant ne disparaît.
- **FR-024**: Toute ligne de journal DOIT nommer son auteur ; une action des règles du service DOIT être marquée « automatique ».
- **FR-025**: Hormis le bannissement, chaque décision DOIT laisser au membre une information sur ce qui s'est passé et une action possible (tableau du prototype, « Aucune décision sans suite pour le membre »).

### Gestes instantanés

- **FR-026**: Un geste DOIT mettre l'écran à jour sans attendre le serveur et rester annulable 5 secondes.
- **FR-027**: Les gestes DOIVENT être envoyés par lots après leur délai d'annulation ; chaque geste DOIT porter une clé qui rend son application unique, même si le lot est renvoyé.
- **FR-028**: Le serveur DOIT trancher chaque geste d'un lot indépendamment et rendre, pour chacun, appliqué, déjà traité (avec l'auteur), cas clos ou échec.
- **FR-029**: Un indicateur DOIT afficher en permanence le nombre de gestes en attente d'envoi et l'état de la connexion.
- **FR-030**: Un cas ouvert par un modérateur DOIT afficher son nom aux autres modérateurs pendant qu'il le traite.
- **FR-031**: Les effets de bord d'un geste (notification, e-mail, suppression de fichiers) DOIVENT s'exécuter après la réponse et ne jamais annuler une décision enregistrée.

### Sanctions graduées

- **FR-032**: Avertir DOIT envoyer au membre un message choisi dans une liste fermée, affiché une fois à sa prochaine connexion.
- **FR-033**: Masquer DOIT retirer le profil de Découvrir pendant 3 mois, afficher au membre le motif et la date de fin, lui permettre de demander une relecture, et lever le masquage seul à l'échéance.
- **FR-034**: Une demande de relecture DOIT créer un cas « relecture » visible dans « À traiter ».

### Activité

- **FR-035**: L'onglet Activité DOIT offrir les chapitres listés en US7 sur trois périodes (7, 30, 90 jours), chacune comparée à la période précédente de même durée.
- **FR-036**: Les phrases DOIVENT être composées à partir de tournures prédéfinies (hausse, baisse, stable au-dessous de 3 % d'écart, singulier, zéro) ; aucun texte libre généré.
- **FR-037**: Toutes les mesures DOIVENT être des agrégats calculés à partir des données déjà collectées : présence au jour près (spec 011), inscriptions, profils, photos, likes, matchs, horodatage des messages, décisions de modération, billets du journal. Aucune nouvelle donnée de présence (ni heure de visite, ni historique) n'est collectée pour ce tableau.
- **FR-038**: « Les moments où l'on se parle » DOIT se fonder sur l'horodatage des messages, pas sur les visites.
- **FR-039**: « Qui reste » DOIT présenter, pour chaque semaine d'arrivée, la part des comptes vus au cours des 14 derniers jours, ramenée à dix personnes.
- **FR-040**: Chaque graphique DOIT avoir une info-bulle au toucher, un libellé accessible et un tableau « Voir les chiffres ».
- **FR-041**: L'onglet DOIT s'afficher sans recalcul complet à chaque visite : une période déjà calculée se réaffiche depuis un cache de quelques minutes.

### Navigation et reprise de l'existant

- **FR-042**: La navigation DOIT tenir en quatre entrées (Activité, Membres, Retours, Outils), en onglets au bas de l'écran sous 900 px et dans l'en-tête au-delà.
- **FR-043**: Chaque page d'administration actuelle DOIT avoir un équivalent, et son ancienne adresse DOIT rediriger vers lui.
- **FR-044**: L'interface DOIT suivre la charte de Libre (tokens existants, thèmes et modes clair et sombre) ; les composants nouveaux (graphiques, bande de gravité, feuille de confirmation, indicateur d'envoi) DOIVENT être proposés dans `DESIGN.md` avant leur code.
- **FR-045**: Toute animation DOIT respecter la préférence de mouvement réduit.

### Sécurité (dépôt public, voir `securite.md`)

- **FR-S01**: Le tirage d'un code DOIT être réservé aux comptes dont l'e-mail est confirmé, non bannis, sans demande en file.
- **FR-S02**: Le tirage et l'envoi du selfie DOIVENT être limités en fréquence par compte et par adresse IP.
- **FR-S03**: Le selfie DOIT être refusé au-delà de 5 Mo ou d'un nombre de pixels fixé avant décodage ; l'OCR DOIT travailler sur une copie réduite.
- **FR-S04**: Les métadonnées du selfie DOIVENT être retirées avant stockage ; l'indice « sans données d'appareil » DOIT se calculer avant, et seul un booléen est conservé. La page membre DOIT ouvrir l'appareil photo plutôt que la galerie quand le navigateur le permet.
- **FR-S05**: Le résultat de la lecture automatique NE DOIT JAMAIS être renvoyé au membre.
- **FR-S06**: Les routes membre de cette spec NE DOIVENT accepter aucun identifiant de membre : elles agissent sur la session seule.
- **FR-S07**: Chaque nouvelle route admin DOIT exiger le rôle relu en base et DOIT refuser (404) si la base ne répond pas.
- **FR-S08**: `POST /api/admin/gestes` DOIT refuser toute requête dont le `Content-Type` n'est pas `application/json` ou dont l'`Origin` diffère de l'origine du site.
- **FR-S09**: Pour chaque geste, le serveur DOIT déduire le membre du cas, et refuser le geste si le membre envoyé diffère.
- **FR-S10**: Une clé de geste DOIT être liée à l'empreinte de son contenu ; une même clé avec un autre contenu DOIT être refusée sans effet.
- **FR-S11**: La suppression d'un compte NE DOIT PAS passer par un lot : geste immédiat avec ressaisie du pseudo. Au-delà de 10 bannissements par heure et par admin, les suivants DOIVENT être refusés et le dépassement journalisé.
- **FR-S12**: Un geste encore dans son délai d'annulation NE DOIT PAS être envoyé à la fermeture de l'onglet.
- **FR-S13**: Le stockage local des gestes NE DOIT contenir ni pseudo ni texte de membre, et DOIT être vidé à la déconnexion.
- **FR-S14**: Toute requête SQL de cette spec DOIT être paramétrée ; la recherche DOIT échapper `%` et `_` ; un curseur invalide DOIT être refusé (400).
- **FR-S15**: Aucun contenu saisi par un membre ou un admin NE DOIT être injecté en HTML brut (`dangerouslySetInnerHTML`, info-bulle HTML).
- **FR-S16**: La demande de relecture DOIT être limitée à une par masquage et en fréquence.
- **FR-S17**: La réponse d'activité DOIT porter `Cache-Control: private, no-store`, et la garde admin DOIT s'exécuter hors de toute fonction mise en cache.
- **FR-S18**: Cette spec N'AJOUTE AUCUNE dépendance ; toute exception exige une justification écrite dans la PR.

### Key Entities

- **Code de vérification** : quatre chiffres, membre, date de tirage, date d'expiration, numéro de tentative. Remplace le geste tiré.
- **Demande de vérification** : existante ; gagne le code attendu, le résultat de la lecture automatique et le numéro de tentative.
- **Geste de modération** : clé d'unicité, auteur, cas visé, type, motif, issue (appliqué, déjà traité, cas clos, échec).
- **Avertissement** : membre, message de la liste fermée, auteur, date, date de lecture.
- **Masquage** : membre, motif, date de fin, demande de relecture éventuelle.
- **Cas** : vue dérivée, jamais stockée en double, des éléments en attente d'un membre (signalement, selfie, photo, réponse, indice, relecture).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un selfie se tranche en moins de 20 secondes en médiane, mesuré entre l'ouverture du cas et la décision.
- **SC-002**: Le délai médian entre l'ouverture d'un cas et sa décision baisse d'au moins 50 % par rapport aux quatre semaines précédant la mise en ligne.
- **SC-003**: Au moins 70 % des membres refusés au selfie refont une tentative dans les 7 jours.
- **SC-004**: Tout cas se traite depuis un téléphone, sans changer d'écran ni défiler horizontalement.
- **SC-005**: Une personne qui n'a jamais modéré tranche correctement 9 cas sur 10 d'un jeu d'essai après la seule lecture du Guide et des repères.
- **SC-006**: Aucun geste n'est appliqué deux fois sur un jeu d'essai de 100 gestes avec coupures réseau simulées.
- **SC-007**: Ouvrir Membres ou une fiche donne un écran utilisable en moins de 2 secondes sur une connexion mobile ordinaire.
- **SC-008**: Trancher 10 cas d'affilée ne coûte pas plus de 3 appels serveur d'écriture.
- **SC-009**: Chaque chiffre du tableau d'activité concorde avec un calcul indépendant sur la base de démonstration.

## Clarifications

### Session 2026-11-11

- Q: Combien de nouveaux essais après un refus de selfie ? → A: essai immédiat ; après 3 refus consécutifs, 24 h d'attente (FR-012).
- Q: Avertir et masquer entrent-ils dans cette spec ? → A: oui, US6 en P2 (FR-032 à FR-034).
- Q: Que devient #524 (spec 011, entrée « Modération » unique) ? → A: fermée comme remplacée par la 012, qui reprend l'exigence des filtres dans l'adresse (FR-016). #523, #525 et #526 restent ouvertes.

## Assumptions

- Le code de quatre chiffres suffit : 8⁴ = 4 096 combinaisons, et la validité de 30 minutes ôte tout intérêt à une préparation.
- La lecture automatique réutilise le moteur déjà embarqué pour les photos (spec 006), sans service externe ni coût.
- Le prototype validé le 2026-11-11 (`proto-bureau.html`) fait foi pour la disposition et l'habillage ; les chiffres qu'il affiche sont factices.
- L'admin peut voir des petits nombres : la règle « cases < 5 » vise ce qui sort vers un agent IA, pas l'interface d'administration.
- La spec 011 reste en vigueur pour la présence au jour près (US1, livrée), les lots (US3), l'inscription sans doublon (US5) et la durée de vie des comptes (US6).
- Les gestes par lot de la spec 011 (US3) s'intégreront au hub par une sélection multiple ; leur comportement reste celui de la 011.
- Un second modérateur est un second compte de rôle administrateur (seul rôle existant) ; l'auteur de chaque action est déjà connu (`adminId` du journal). Aucun rôle ni permission fine n'est ajouté.
- Les repères d'événements de la courbe viennent des billets publiés du journal public.

## Hors périmètre

- Toute décision automatique de sanction ou de validation.
- Une file d'attribution des cas entre modérateurs (au-delà de l'affichage « ouvert par »).
- Une messagerie entre modération et membre au-delà de l'avertissement et de la réponse aux retours.
- Une nouvelle collecte de données de présence ou de navigation.
