# Feature Specification: Indice de fiabilité et demande de vérification automatique

**Feature Branch**: `010-indice-fiabilite`

**Created**: 2026-10-05

**Status**: Draft

**Input**: User description: "Indice de fiabilité des comptes et demande de vérification automatique (suite de la spec 006 faux profils). Quand plusieurs indices sérieux de doute s'accumulent sur un compte, on pousse ce compte à faire la vérification selfie s'il ne l'a pas déjà ; l'admin dispose d'un indice de fiabilité par compte pour filtrer et trier la liste des membres et voir les comptes douteux. Nouveaux signaux calculés chez nous, gratuits, sans sous-traitant, sans IA sur les données de membres : blocages en rafale, rythme de likes anormal, retour d'un banni (appareil, e-mail), appareil partagé, lexique de l'arnaque, fuseau horaire incohérent, profil monté en quelques minutes, rafale d'inscriptions depuis une même adresse IP. Dans le respect du RGPD."

## Contexte

La spec 006 a outillé la modération contre le cas du 2026-09-24 (photo volée,
identifiant Telegram incrusté, paiement en coupons de bureau de tabac) : contact
externe, photo réutilisée ou déjà bannie, signalements, file « Profils à
vérifier ». Elle laisse deux angles morts :

1. **Le comportement** : un compte qui ratisse large (likes en rafale), que les
   membres bloquent sans le signaler, ou qui revient après un bannissement avec
   de nouvelles photos, ne lève aujourd'hui aucun signal.
2. **La vue d'ensemble** : le modérateur ne voit un compte douteux que s'il
   entre dans la file. La liste des membres ne permet pas de repérer ceux qui
   cumulent des indices faibles.

Cette spec ajoute des signaux, les agrège en un **indice de fiabilité** lisible
seulement par l'admin, et **invite automatiquement** à la vérification selfie
(badge #436) un compte qui cumule des doutes sérieux. Toute sanction reste une
décision humaine.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Les signaux forts de comportement entrent dans la file (Priority: P1)

Un compte est bloqué par trois membres sans lien entre eux en deux jours ; un
autre s'inscrit depuis l'appareil d'un compte banni le mois dernier ; un
troisième écrit « paiement en coupon PCS » dans sa bio. Chacun lève un signal
fort et apparaît dans la file « Profils à vérifier », avec le motif lisible par
le modérateur.

**Why this priority**: c'est ce qui aurait rattrapé le scammeur du 24 septembre
s'il était revenu avec de nouvelles photos, et ce qui repère les comptes que les
membres fuient sans les signaler. Aucune nouvelle collecte n'est nécessaire,
sauf l'empreinte retenue au bannissement.

**Independent Test**: créer trois comptes qui bloquent un même compte dans la
fenêtre ; bannir un compte puis en créer un autre depuis le même appareil ou la
même adresse e-mail normalisée ; écrire un terme du lexique dans une bio.
Vérifier que chaque compte visé apparaît dans la file avec son signal.

**Acceptance Scenarios**:

1. **Given** un compte bloqué par au moins 3 membres distincts en 48 h, **When** le troisième blocage est enregistré, **Then** un signal fort « bloqué à répétition » est levé et le compte entre dans la file.
2. **Given** un compte banni, **When** un nouveau compte s'inscrit avec le même identifiant d'appareil ou la même adresse e-mail normalisée dans l'année qui suit, **Then** un signal fort « retour d'un compte banni » est levé dès l'inscription.
3. **Given** une bio ou un pseudo qui contient un terme du lexique de l'arnaque, **When** le membre l'enregistre, **Then** l'enregistrement aboutit et un signal fort « lexique de l'arnaque » est levé, avec l'extrait en cause.
4. **Given** un membre bloqué par deux personnes seulement, ou par trois personnes réparties sur plus de 48 h, **Then** aucun signal n'est levé.

---

### User Story 2 - Invitation automatique à se faire vérifier (Priority: P1)

Quand un compte non vérifié cumule un doute sérieux (rythme de likes anormal,
ou un signal fort, ou un faisceau d'indices faibles), il reçoit sans
intervention humaine une invitation à faire la vérification selfie. La copie
présente la vérification comme un plus pour tout le monde, jamais comme un
soupçon.

**Why this priority**: c'est le levier demandé par l'opérateur. Un vrai membre
fait le selfie en une minute et le doute est levé ; un scammeur qui vole des
photos ne peut pas le faire. Le badge tranche à la place du modérateur dans la
majorité des cas.

**Independent Test**: provoquer une rafale de likes sur un compte neuf non
vérifié ; vérifier que l'invitation apparaît au compte, qu'elle ne contient ni
motif ni chiffre, et que le même scénario sur un compte déjà vérifié ne produit
rien.

**Acceptance Scenarios**:

1. **Given** un compte non vérifié de moins de 7 jours qui envoie au moins 30 likes en 24 h, dont au moins 15 en 10 minutes, **Then** un signal « rythme de likes anormal » est levé et le compte est invité à se faire vérifier.
2. **Given** un compte non vérifié qui atteint le seuil « doute sérieux » de l'indice (FR-014), **Then** il est invité à se faire vérifier.
3. **Given** un compte déjà vérifié, **When** il atteint ce seuil, **Then** aucune invitation n'est envoyée ; le compte entre dans la file si les règles de la spec 006 le prévoient.
4. **Given** un compte invité qui obtient le badge, **Then** l'invitation disparaît et l'indice remonte (FR-013).
5. **Given** un compte invité, **Then** il reste visible dans Découvrir et peut écrire comme avant ; il entre dans la file, et seul un modérateur peut le mettre en retrait.

---

### User Story 3 - Indice de fiabilité dans la liste admin des membres (Priority: P2)

Dans Admin › Membres, le modérateur trie et filtre la liste par indice de
fiabilité, voit en un coup d'œil les comptes « à surveiller » ou « douteux », et
sur la fiche d'un membre la liste des indices qui composent son indice.

**Why this priority**: c'est la vue d'ensemble qui manque. Elle rend visibles
les comptes qui cumulent des indices faibles sans jamais entrer dans la file.
Elle dépend des signaux de US1/US4 pour être utile.

**Independent Test**: avec des comptes de test portant différents signaux,
vérifier le tri, le filtre par niveau, et que chaque niveau s'explique par la
liste de ses indices sur la fiche.

**Acceptance Scenarios**:

1. **Given** la liste des membres, **When** le modérateur filtre sur « douteux », **Then** seuls les comptes de ce niveau apparaissent, triés du plus douteux au moins douteux.
2. **Given** la fiche d'un membre, **Then** chaque indice qui pèse sur son niveau est listé avec son type, sa force, sa date et, pour les indices faibles, la mention qu'ils peuvent être légitimes.
3. **Given** un membre, **When** il consulte l'une de ses propres réponses d'API ou l'une de celles d'un autre membre, **Then** ni l'indice, ni les signaux, ni le niveau n'y figurent.

---

### User Story 4 - Indices faibles de contexte (Priority: P3)

Le système relève des indices qui peuvent avoir une explication banale et ne
pèsent qu'en combinaison : plusieurs comptes sur le même appareil, fuseau
horaire du navigateur hors d'Europe pour une ville saisie en France, profil
complet monté en quelques minutes, rafale d'inscriptions depuis une même
adresse IP.

**Why this priority**: chacun seul ne prouve rien (appareil partagé dans un
couple, membre en voyage, personne efficace). Ils servent à départager dans
l'indice, pas à déclencher.

**Independent Test**: provoquer chaque indice séparément et vérifier qu'aucun ne
déclenche ni entrée en file ni invitation ; en provoquer trois sur un même
compte et vérifier que l'indice passe au niveau prévu.

**Acceptance Scenarios**:

1. **Given** deux comptes actifs qui partagent un identifiant d'appareil, **Then** chacun porte l'indice faible « appareil partagé », visible de l'admin seulement.
2. **Given** un membre dont la ville saisie est en France et dont le navigateur déclare un fuseau hors d'Europe et de l'outre-mer français, **Then** l'indice faible « fuseau incohérent » est levé.
3. **Given** un compte qui, en moins de 15 minutes après la vérification de son e-mail, a ajouté toutes ses photos, rempli sa bio et envoyé au moins 10 likes, **Then** l'indice faible « profil monté d'un coup » est levé.
4. **Given** au moins 3 inscriptions depuis la même adresse IP en 24 h, **Then** chacun de ces comptes porte l'indice faible « inscriptions groupées ».
5. **Given** un seul indice faible, quel qu'il soit, **Then** aucune entrée de file ni invitation n'en résulte.

---

### User Story 5 - Transparence RGPD (Priority: P2)

La politique de confidentialité explique, en phrases complètes, que le service
calcule des indicateurs de sécurité pour repérer les faux profils, sur quelles
catégories de données, sur quelle base légale, combien de temps elles sont
gardées, et que toute sanction est décidée par une personne. Le tableau de
conservation en tient compte.

**Why this priority**: c'est un profilage au sens du RGPD ; le livrer sans
transparence serait une promesse non adossée (constitution, principe III).

**Independent Test**: vérifier que chaque nouvelle donnée conservée a sa ligne
dans le tableau de conservation, que la purge l'efface à l'échéance, et que la
politique décrit le traitement.

**Acceptance Scenarios**:

1. **Given** la politique publiée, **Then** elle décrit le traitement, sa base légale (intérêt légitime : sécurité des membres), les catégories de données et le recours humain.
2. **Given** chaque nouvelle donnée conservée (empreintes d'appareil et d'e-mail des bannis, adresse IP hachée, indices), **Then** elle figure dans le tableau de conservation et la purge l'efface à l'échéance.

---

### Edge Cases

- **Blocages coordonnés** : un groupe qui bloque un membre pour lui nuire. Le seuil exige des bloqueurs distincts et anciens d'au moins 7 jours ; le signal mène à une invitation ou à la file, jamais à une sanction.
- **Appareil partagé légitime** (couple, famille) : l'indice reste faible et le modérateur voit la mention « peut être légitime ».
- **Membre en voyage** ou expatrié qui revient : le fuseau incohérent est faible et n'agit qu'en combinaison.
- **Lexique ambigu** (« coupon » dans une bio sur les bons plans) : le signal mène à la file ou à l'invitation, jamais à un refus d'enregistrement ni à une sanction automatique.
- **Banni qui change d'appareil et d'adresse** : non couvert, le reste de la spec 006 (photos) prend le relais.
- **Réinstallation, effacement du navigateur** : l'identifiant d'appareil change ; aucun signal, c'est attendu.
- **Compte déjà en retrait par un modérateur** : pas d'invitation automatique en double ; l'invitation existante suffit.
- **Compte vérifié qui accumule des signaux** : pas d'invitation, mais il reste visible dans la file et dans le filtre admin (une vérification prouve un visage, pas une intention).
- **Badge refusé** après une invitation : le compte entre dans la file, la décision revient au modérateur.

## Requirements *(mandatory)*

### Nouveaux signaux

- **FR-001**: Le système MUST lever un signal **fort** « bloqué à répétition » quand un compte est bloqué par au moins 3 membres distincts en 48 h, chaque bloqueur ayant au moins 7 jours d'ancienneté.
- **FR-002**: Au bannissement, le système MUST retenir, en plus des empreintes de photos, une empreinte hachée de l'identifiant d'appareil et de l'adresse e-mail normalisée du compte, sans la valeur en clair, pendant **1 an**.
- **FR-003**: À l'inscription, le système MUST comparer l'appareil et l'e-mail normalisé aux empreintes retenues et lever un signal **fort** « retour d'un compte banni » en cas de correspondance.
- **FR-004**: Le système MUST lever un signal **fort** « lexique de l'arnaque » quand la bio ou le pseudo contient un terme d'une liste fixe maintenue dans le code (modifiée par PR) : moyens de paiement prépayés (PCS, Transcash, Neosurf, coupon, recharge), rencontres tarifées (« rencontre rémunérée », « sugar daddy », « sugar baby », « tarif »). L'enregistrement n'est **pas** refusé.
- **FR-005**: Le système MUST lever un signal « rythme de likes anormal » quand un compte de moins de 7 jours envoie au moins 30 likes en 24 h glissantes, dont au moins 15 en 10 minutes. Le « passer » n'est pas enregistré par le service (geste local à l'appareil) : la rafale tient lieu de « like sans regarder » (research R3).
- **FR-006**: Le système MUST lever un indice **faible** « appareil partagé » sur chaque compte actif qui partage un identifiant d'appareil avec un autre compte actif.
- **FR-007**: Le système MUST lever un indice **faible** « fuseau incohérent » quand le fuseau horaire déclaré par le navigateur est hors d'Europe et hors outre-mer français alors que la ville saisie est en France. Seul le résultat de la comparaison est conservé, jamais le fuseau.
- **FR-008**: Le système MUST lever un indice **faible** « profil monté d'un coup » quand, en moins de 15 minutes après la vérification de l'e-mail, le compte a ajouté toutes ses photos, rempli sa bio et envoyé au moins 10 likes.
- **FR-009**: Le système MUST lever un indice **faible** « inscriptions groupées » sur chaque compte inscrit depuis une adresse IP qui a servi à au moins 3 inscriptions en 24 h. L'adresse n'est conservée que hachée avec un sel secret, pendant **7 jours**.
- **FR-010**: Tous les signaux MUST suivre le format de la spec 006 (type, force, contenu en cause, date), être calculés après l'action du membre sans la retarder ni la faire échouer, et ne jamais faire appel à un service tiers ni à un modèle d'IA.
- **FR-011**: Un indice faible seul MUST NOT créer d'entrée de file ni d'invitation.

### Indice de fiabilité

- **FR-012**: Le système MUST dériver pour chaque compte un **niveau** parmi trois : « fiable », « à surveiller », « douteux », à partir de ses signaux non tranchés.
- **FR-013**: Le badge vérifié MUST faire baisser le niveau d'un cran ; une décision « Rien à signaler » MUST neutraliser les signaux qu'elle a tranchés (comme dans la spec 006).
- **FR-014**: Le seuil « doute sérieux » MUST être atteint par : un signal fort, **ou** le rythme de likes anormal, **ou** au moins 3 indices faibles de types différents. Il correspond au niveau « douteux ».
- **FR-015**: Le niveau MUST être explicable : la fiche admin liste chaque signal qui y contribue. Aucune pondération cachée.
- **FR-016**: La liste admin des membres MUST permettre de filtrer par niveau et de trier du plus douteux au moins douteux.

### Invitation automatique

- **FR-017**: Un compte non vérifié qui atteint le seuil « doute sérieux » MUST recevoir automatiquement une invitation insistante à la vérification selfie (bandeau persistant et rappel), **sans effet sur sa visibilité ni sur ses échanges**, et entrer dans la file « Profils à vérifier ». La mise en retrait reste une décision du modérateur, prise depuis la file (spec 006, FR-018b).
- **FR-018**: La copie de l'invitation MUST ne mentionner aucun motif, aucun chiffre, aucun soupçon ; elle présente la vérification comme une protection pour toutes et tous.
- **FR-019**: L'obtention du badge MUST retirer l'invitation sans intervention ; un refus du badge MUST faire entrer le compte dans la file.
- **FR-020**: Chaque invitation automatique MUST être journalisée dans les logs de modération (compte, motifs, date), avec un auteur « automatique » distinct d'un modérateur.

### Vie privée et RGPD

- **FR-021**: L'indice, le niveau, les signaux et les empreintes MUST NOT figurer dans aucune réponse lue par un membre (y compris le membre concerné) ni dans aucune charge utile push. Une garde de non-fuite par route le vérifie, sur le modèle des gardes existantes.
- **FR-022**: Le système MUST NOT prendre de sanction (bannissement, suppression) fondée sur l'indice sans décision d'un modérateur.
- **FR-023**: Chaque nouvelle donnée conservée MUST avoir sa règle dans le tableau de conservation (source unique) et être effacée par la purge à l'échéance : empreintes d'appareil et d'e-mail des bannis 1 an, adresse IP hachée 7 jours, signaux selon les règles existantes de la spec 006.
- **FR-024**: La politique de confidentialité MUST décrire ce traitement : finalité (sécurité des membres contre les faux profils et les arnaques), base légale (intérêt légitime), catégories de données, durées, et le fait que toute sanction est décidée par une personne, avec le droit de la contester.
- **FR-025**: Les profils existants MUST être évalués une fois au déploiement pour les signaux calculables a posteriori (blocages, appareil partagé, lexique) ; les signaux qui demandent une donnée nouvelle (fuseau, adresse IP) ne s'appliquent qu'aux nouvelles inscriptions et connexions.

### Key Entities

- **Signal de profil** (existant, spec 006) : s'enrichit des nouveaux types de signaux ci-dessus.
- **Empreinte de banni** (étendue) : en plus des empreintes de photos, empreintes hachées de l'appareil et de l'e-mail normalisé ; durée 1 an ; sans lien vers le compte supprimé.
- **Trace d'inscription** : adresse IP hachée et date, seulement pour compter les inscriptions groupées ; durée 7 jours.
- **Niveau de fiabilité** : dérivé des signaux, jamais saisi ; privé, admin seulement.
- **Invitation à la vérification** : état d'un compte invité (date, origine automatique ou modérateur), levé par le badge.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un compte qui rejoue le cas du 2026-09-24 avec de nouvelles photos depuis le même appareil ou le même e-mail est repéré dès son inscription, avant son premier message.
- **SC-002**: Un compte bloqué par 3 membres distincts en 48 h apparaît dans la file dans les 5 minutes qui suivent le troisième blocage.
- **SC-003**: Le modérateur isole les comptes « douteux » de toute la base en une seule action de filtre, et comprend pourquoi chacun l'est sans ouvrir autre chose que sa fiche.
- **SC-004**: Aucune réponse lue par un membre ne contient l'indice, le niveau ou un signal (garde automatisée sur chaque route concernée).
- **SC-005**: Aucun compte n'est banni ou supprimé sans décision humaine journalisée.
- **SC-006**: Sur le premier mois, au moins la moitié des comptes invités automatiquement font la vérification ou cessent d'être actifs, mesuré par agrégats (cases de moins de 5 masquées).
- **SC-007**: La part de comptes « fiables » invités à tort, estimée sur les dossiers tranchés « Rien à signaler », reste sous 10 % des invitations ; au-delà, les seuils sont revus.

## Clarifications

### Session 2026-10-05

- Constat du plan : le « passer » de Découvrir n'est pas enregistré côté service. FR-005 mesure la rafale (15 likes en 10 minutes) plutôt que la part de « passer », pour ne pas créer une collecte nouvelle.
- Q: L'invitation automatique met-elle le compte en retrait ? → A: Non. Invitation insistante sans effet sur la visibilité ; le compte entre dans la file et la mise en retrait reste une décision humaine (RGPD art. 22 : le retrait mène à l'effacement après 90 jours sans selfie).

## Assumptions

- La liste admin des membres et sa fiche existent déjà ; on y ajoute un filtre, un tri et un bloc d'indices, sans nouvelle surface.
- Les seuils (3 blocages en 48 h, 30 likes en 24 h dont 15 en 10 minutes, 15 minutes, 3 inscriptions par adresse en 24 h) sont des valeurs de départ, ajustables par PR après mesure. Au lancement (≈170 comptes), elles visent les cas évidents.
- Le lexique de l'arnaque **ne refuse pas** l'enregistrement, contrairement au contact externe (spec 006) : ses termes sont ambigus hors contexte.
- « Europe » pour le fuseau comprend l'Europe géographique, l'outre-mer français et les fuseaux de pays limitrophes courants ; la liste exacte est fixée au plan.
- L'adresse IP est déjà vue par le service pour la limite de débit ; on conserve seulement son empreinte salée, 7 jours.
- Les signaux de messagerie (premier message envoyé en masse, matchs défaits juste après) restent dans le périmètre de #370 et pourront alimenter le même indice ensuite.
- Hors périmètre : comparaison faciale, recherche inversée automatique, empreinte de navigateur au-delà de l'identifiant d'appareil existant, faux profils pièges, toute décision automatique de bannissement.
- Dépendances : spec 006 (file, signaux, retrait, empreintes de bannis), badge selfie #436, purge de rétention.
