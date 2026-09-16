# Feature Specification: Notifications et badges — savoir qu'on t'a parlé, sans appât

**Feature Branch**: `003-notifications-badges`

**Created**: 2026-09-16

**Status**: Clarifié (session 2026-09-16) — prêt pour le plan

**Issues** : recadre #158 (push + badge + son) ; exclut #161 / #195 (match « nouveau », `needs-design`)

**Input** : discussion opérateur du 2026-09-16 : « voir ce qui existe et ce qu'on peut ajouter pour des badges ou notifs en cas de like, match et nouveaux messages ; et un badge pour mon compte admin ». Périmètre retenu : pastille de messages non lus (in-app + icône de l'app installée), Web Push opt-in (match, message, file admin), badges de file de travail pour l'admin. Pas de likes reçus, pas de compteur-appât, push désactivé par défaut.

---

## Contexte

Aujourd'hui, Libre ne prévient de rien quand on n'a pas les yeux dessus.

- Un **match** est annoncé en temps réel par une célébration à l'écran (`MatchDialog`), mais seulement si la personne est connectée à ce moment-là. Hors ligne, rien ; elle le découvrira en ouvrant Messages, si elle y pense.
- Un **message** n'est signalé que si la conversation concernée est ouverte. Depuis Découvrir, La Place ou Profil, un message reçu ne change rien à l'écran : ni l'onglet Messages, ni la liste des conversations ne le distinguent. Chaque message porte pourtant déjà une date de lecture (`readAt`), posée quand la conversation est ouverte — le « non lu » existe en base, il n'est simplement jamais montré.
- L'**application installée** (PWA) a un manifeste complet et un service worker, mais celui-ci ne fait que du cache : aucune notification système, aucun badge sur l'icône.
- L'**administrateur** dispose d'un tableau de bord qui compte les signalements, vérifications et retours en attente — mais il faut aller le consulter. Rien dans la barre du site ni dans la navigation admin ne signale qu'une file s'est remplie.

Le manque est réel : sur une app de rencontre, un message auquel on ne répond pas pendant trois jours parce qu'on ne l'a pas vu, c'est une rencontre qui n'a pas lieu. Et un signalement qui attend parce que l'admin n'est pas passé par le tableau de bord, c'est une personne en danger qu'on laisse attendre.

### Ce que la charte interdit — et pourquoi ça cadre tout

`PRODUCT.md` bannit explicitement : « pas de badge qui clignote, pas de notification Streak, pas de "tu as 3 likes non lus" comme appât », « pas de compteur de likes façon Tinder ». La constitution (principe I) ajoute qu'aucune fonctionnalité ne se justifie par l'engagement qu'elle produit.

Cette spec est donc **délibérément étroite** :

| Événement | Décision | Motif |
|---|---|---|
| Quelqu'un t'a **liké** | **Rien.** Ni badge, ni notification, ni écran « qui t'a liké ». | C'est l'appât Tinder par excellence. Seule la réciprocité (le match) compte. Il n'existe d'ailleurs aucune surface « likes reçus » aujourd'hui, et on n'en crée pas. |
| Un **match** | Célébration à l'écran (existant) + notification système **si la personne l'a demandé**. | Un match est un fait humain réciproque, pas une mécanique. |
| Un **message** | Pastille **sans chiffre** sur l'onglet Messages et sur la conversation concernée ; badge sur l'icône de l'app installée ; notification système **si demandée**, au texte générique. | Quelqu'un te parle : c'est de la réassurance utile, pas un hameçon. Le chiffre est ce qui transforme l'information en pression — on s'en passe. |
| **File admin** (signalement, vérification, retour) | Compteurs chiffrés dans l'admin, pastille sur l'accès admin, notification système pour les admins abonnés. | C'est une file de travail, pas une mécanique de rétention : le chiffre y est légitime. |

Deux conséquences techniques assumées : la notification d'un message **ne contient jamais son contenu** (il est chiffré de bout en bout ; le service ne le voit pas et l'écran verrouillé non plus), et la notification système est **désactivée par défaut** — c'est la personne qui l'allume, depuis ses paramètres, jamais une bannière qui l'y pousse.

### Ce qui reste hors périmètre

- Le badge « nouveau » sur un match sans message, le tri et les filtres de Messages (#161, #195) : demandent une décision de design sur ce qu'est un match « vu ».
- Le son de notification (proposé dans #158) : sans valeur humaine identifiée, contraire à « densité douce ».
- Les notifications par e-mail ou SMS : le stub `trust/notify.ts` reste V2, décision #43 (pas de contacts hors-app).
- Les notifications de croisements : dérivées de la géolocalisation, non stockées, hors sujet ici.

---

## Clarifications

### Session 2026-09-16

- Q: Quand plusieurs messages arrivent dans une même conversation alors que l'app est fermée, comment limite-t-on les notifications système ? → A: une seule notification par conversation tant que ses messages non lus n'ont pas été lus ; la suivante ne part qu'après une lecture (pas de minuteur, pas d'état à stocker).
- Q: Si Libre est ouverte et au premier plan mais sur une autre page que la conversation, un message reçu déclenche-t-il quand même une notification système ? → A: non — aucune notification système tant qu'une fenêtre de Libre est au premier plan, quelle que soit la page ; la pastille in-app suffit.
- Q: Comment la pastille d'accès admin et les compteurs de la navigation admin restent-ils à jour ? → A: recalcul à chaque navigation et à chaque retour au premier plan ; pas de canal temps réel, pas de minuterie.
- Q: Le badge sur l'icône de l'app installée porte-t-il un nombre ? → A: non — badge sans nombre sur toutes les plateformes, rendu minimal accepté sur iOS.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Voir qu'on m'a écrit, d'où que je sois dans l'app (Priority: P1)

Camille est sur Découvrir. Sam, avec qui elle a matché hier, lui envoie un message. Sans quitter Découvrir, Camille voit une petite pastille apparaître sur l'onglet Messages. Elle ouvre Messages : la conversation avec Sam porte la même pastille. Elle l'ouvre, lit ; les pastilles disparaissent. Aucun chiffre nulle part.

**Why this priority** : c'est le manque le plus fréquent et le moins coûteux à combler — la donnée « non lu » existe déjà, il ne manque que de la montrer. Sans migration de base.

**Independent Test** : deux comptes, deux navigateurs. A envoie un message à B pendant que B est sur Découvrir : la pastille apparaît sur l'onglet Messages de B sans rechargement. B ouvre la conversation : la pastille disparaît, sur l'onglet comme dans la liste.

**Acceptance Scenarios** :

1. **Given** Camille connectée sur n'importe quelle page de l'app, **When** elle reçoit un message dans une conversation qu'elle n'a pas ouverte, **Then** une pastille apparaît sur l'onglet Messages sans rechargement de la page.
2. **Given** au moins un message non lu, **When** Camille ouvre la page Messages, **Then** chaque conversation contenant un message non lu porte une pastille, les autres non.
3. **Given** une conversation avec des messages non lus, **When** Camille l'ouvre, **Then** la pastille de cette conversation et — s'il n'en reste aucune autre — celle de l'onglet Messages disparaissent.
4. **Given** Camille qui recharge l'app ou s'y reconnecte, **When** la page s'affiche, **Then** l'état des pastilles reflète les messages non lus en base, sans dépendre d'un événement temps réel manqué.
5. **Given** un message envoyé par Camille elle-même, **When** il est enregistré, **Then** aucune pastille n'apparaît chez elle.
6. **Given** n'importe quel écran de l'app, **When** on cherche un nombre de messages non lus, **Then** on n'en trouve aucun — la pastille est une présence, pas un compte.

---

### User Story 2 — Un badge sur l'icône de l'app installée (Priority: P2)

Camille a ajouté Libre à l'écran d'accueil de son téléphone. Quand elle a un message non lu, l'icône de Libre porte un badge. Quand elle a tout lu, le badge disparaît. Si elle utilise Libre dans un simple onglet de navigateur, rien ne change pour elle.

**Why this priority** : découle directement de la story 1 (même information, une surface de plus) et donne à l'app installée une valeur concrète. Sans migration.

**Independent Test** : installer la PWA sur un Android ou un iPhone, recevoir un message, observer l'icône ; lire le message, observer l'icône.

**Acceptance Scenarios** :

1. **Given** l'app installée et au moins un message non lu, **When** Camille revient à l'écran d'accueil, **Then** l'icône porte un badge sans nombre.
2. **Given** l'app installée et le badge visible, **When** Camille lit tous ses messages non lus, **Then** le badge disparaît sans qu'elle ait à fermer l'app.
3. **Given** un navigateur ou une plateforme qui ne prend pas en charge le badge d'icône, **When** l'app tente de le poser, **Then** rien ne casse et l'expérience in-app (story 1) reste intacte.
4. **Given** Camille qui se déconnecte, **When** la déconnexion est effective, **Then** le badge est retiré.

---

### User Story 3 — L'admin voit ses files se remplir sans aller les chercher (Priority: P2)

L'administrateur est connecté comme n'importe quel membre. Dès qu'un signalement, une demande de vérification ou un retour est en attente, l'accès à l'administration dans la barre du site porte une pastille. Dans l'administration, chaque entrée de navigation concernée (Signalements, Vérifications, Retours) affiche le nombre d'éléments en attente. Les compteurs sont recalculés à chaque changement de page et quand l'admin revient sur l'app.

**Why this priority** : un signalement qui attend est un risque pour une personne. Le compteur existe déjà en base et dans l'API ; il ne manque qu'à le porter là où l'admin passe. Sans migration.

**Independent Test** : compte admin + compte membre. Le membre signale un profil : la pastille apparaît sur l'accès admin du compte admin, et « Signalements » affiche `1`. L'admin traite le signalement : le compteur tombe à `0` et la pastille disparaît si aucune autre file n'est en attente.

**Acceptance Scenarios** :

1. **Given** un compte au rôle admin et au moins un élément en attente dans une file, **When** il navigue dans l'app membre, **Then** l'accès à l'administration porte une pastille.
2. **Given** l'administration ouverte, **When** on regarde la navigation, **Then** Signalements, Vérifications et Retours affichent chacun le nombre d'éléments en attente, et rien n'est affiché à côté d'une file vide.
3. **Given** un élément traité (signalement résolu, vérification décidée, retour clos), **When** l'admin revient à la navigation, **Then** le compteur a diminué d'un.
4. **Given** un compte sans rôle admin, **When** il navigue, **Then** aucune pastille ni compteur d'administration n'est visible ni chargé.

---

### User Story 4 — Être prévenu hors de l'app, parce que je l'ai demandé (Priority: P3)

Dans ses paramètres, Camille trouve une option « Me prévenir hors de l'app ». Elle est désactivée. Camille l'active ; son téléphone lui demande l'autorisation ; elle accepte. Désormais, quand Sam lui écrit alors que Libre est fermée, une notification « Nouveau message » apparaît. Elle la touche : Libre s'ouvre sur la conversation. Quand elle matche, une notification « Nouveau match » l'emmène vers Messages. Le contenu des messages n'apparaît jamais dans la notification. Camille peut désactiver l'option à tout moment ; elle peut aussi l'avoir activée sur son téléphone et pas sur son ordinateur.

**Why this priority** : c'est le seul moyen de ramener quelqu'un qui n'a pas l'app ouverte — et c'est aussi le sujet le plus sensible côté charte, d'où l'opt-in strict. Nécessite une nouvelle donnée en base (les abonnements d'appareils).

**Independent Test** : activer l'option sur un appareil A, fermer l'app, envoyer un message depuis B : la notification arrive sur A ; la toucher ouvre la conversation. Désactiver l'option : plus de notification.

**Acceptance Scenarios** :

1. **Given** un compte fraîchement créé, **When** Camille ouvre ses paramètres, **Then** l'option de notification hors de l'app est présente et **désactivée**, et aucune demande d'autorisation ne lui a été faite avant qu'elle ne touche l'option.
2. **Given** l'option activée et l'autorisation accordée sur cet appareil, **When** un message lui parvient alors que l'app n'est pas au premier plan, **Then** une notification système s'affiche, dont le texte ne contient ni le contenu du message ni le nom de l'expéditeur.
3. **Given** une notification de message, **When** Camille la touche, **Then** l'app s'ouvre directement sur la conversation concernée.
4. **Given** l'option activée, **When** Camille matche, **Then** une notification « Nouveau match » s'affiche et l'emmène vers Messages.
5. **Given** l'option activée sur un appareil, **When** Camille la désactive, **Then** cet appareil ne reçoit plus rien, sans effet sur ses autres appareils.
6. **Given** un appareil où l'autorisation système a été refusée, **When** Camille regarde l'option, **Then** l'app lui explique que l'autorisation est bloquée au niveau de l'appareil, sans réinsister.
7. **Given** un iPhone où Libre est ouverte dans le navigateur et non installée, **When** Camille regarde l'option, **Then** l'app lui explique qu'il faut d'abord ajouter Libre à l'écran d'accueil, et comment.
8. **Given** un appareil dont l'abonnement n'est plus valide (app désinstallée, autorisation retirée), **When** une notification lui est destinée, **Then** l'envoi échoue sans effet visible pour personne et l'abonnement est retiré.
9. **Given** Camille qui se déconnecte de cet appareil, **When** la déconnexion est effective, **Then** l'appareil ne reçoit plus de notification pour ce compte.
10. **Given** l'app ouverte au premier plan, sur n'importe quelle page, **When** un message ou un match arrive, **Then** aucune notification système ne s'affiche : la pastille (ou la célébration de match) fait le travail.

---

### User Story 5 — L'admin prévenu d'un signalement même l'app fermée (Priority: P3)

L'administrateur active la même option dans ses paramètres. Quand un membre signale un profil ou envoie un retour, il reçoit une notification « Nouveau signalement » / « Nouveau retour » qui ouvre directement la file concernée dans l'administration.

**Why this priority** : prolonge la story 4 avec la même mécanique ; la valeur est la réactivité de modération.

**Independent Test** : compte admin abonné, app fermée ; un membre signale un profil : la notification arrive et ouvre `/admin/reports`.

**Acceptance Scenarios** :

1. **Given** un admin abonné et l'app fermée, **When** un membre crée un signalement, **Then** l'admin reçoit une notification qui ouvre la file des signalements.
2. **Given** un admin abonné, **When** un membre envoie un retour, **Then** l'admin reçoit une notification qui ouvre la file des retours.
3. **Given** un membre (non admin) abonné, **When** un signalement est créé, **Then** il ne reçoit rien.
4. **Given** une notification admin, **When** on lit son texte, **Then** il ne contient ni le nom du signalé, ni celui du signalant, ni le motif.

---

### Edge Cases

- **Événement temps réel manqué** (onglet en veille, connexion coupée) : la pastille se resynchronise au prochain chargement ou retour au premier plan à partir de l'état en base, jamais uniquement à partir des événements reçus.
- **Message supprimé par son auteur avant lecture** : il ne compte plus comme non lu.
- **Conversation avec une personne bloquée ou bannie** : ses messages ne créent pas de pastille et n'envoient pas de notification.
- **Plusieurs onglets ouverts** : la lecture dans un onglet fait disparaître la pastille dans les autres au plus tard à leur prochain rafraîchissement.
- **Rafale de messages** (dix messages en dix secondes) : une seule notification système pour la conversation — celle du premier message non lu ; les suivants n'en produisent pas tant que la conversation n'a pas été rouverte.
- **Autorisation accordée puis révoquée dans les réglages du téléphone** : l'app le constate et remet l'option en désactivé, avec l'explication du scénario 4.6.
- **Perte de la couche temps réel ou de la couche notification** (quota, panne du fournisseur) : l'envoi du message, du like ou du signalement **réussit quand même** ; seul l'avertissement est perdu, et il est journalisé.
- **Compte supprimé** : ses abonnements de notification disparaissent avec lui.
- **Badge d'icône refusé par la plateforme** : aucun message d'erreur, l'app continue.

---

## Requirements *(mandatory)*

### Functional Requirements

**Non-lus in-app (story 1)**

- **FR-001** : L'app DOIT indiquer sur l'onglet Messages la présence d'au moins un message non lu adressé à la personne connectée, par une pastille sans chiffre.
- **FR-002** : La liste des conversations DOIT distinguer, par la même pastille, chaque conversation contenant au moins un message non lu.
- **FR-003** : Est « non lu » un message reçu (non envoyé par soi), non supprimé, dans une conversation avec une personne ni bloquée ni bannie, et sans date de lecture.
- **FR-004** : L'ouverture d'une conversation DOIT marquer lus ses messages reçus (comportement existant) et faire disparaître les pastilles correspondantes sans rechargement.
- **FR-005** : La pastille DOIT réagir en temps réel à l'arrivée d'un message où que la personne se trouve dans l'app connectée, et DOIT se resynchroniser avec l'état en base à chaque chargement et retour au premier plan.
- **FR-006** : L'app NE DOIT afficher aucun nombre de messages, de conversations non lues, ni de likes reçus, sur aucune surface membre.
- **FR-007** : La pastille DOIT être un composant du Design System, statique (aucune animation, aucun clignotement), avec un libellé accessible (« Nouveaux messages »).

**Badge d'icône (story 2)**

- **FR-008** : Quand l'app est installée et que la plateforme le permet, l'icône DOIT porter un badge **sans nombre** tant qu'il existe au moins un message non lu, et le perdre dès qu'il n'en reste plus ou à la déconnexion. Le rendu minimal d'un badge sans valeur sur iOS est accepté ; on ne bascule pas sur un chiffre pour le rendre plus visible.
- **FR-009** : L'absence de prise en charge du badge d'icône NE DOIT produire ni erreur visible ni dégradation de l'expérience in-app.

**Files admin (story 3)**

- **FR-010** : Pour un compte admin, l'accès à l'administration depuis l'app membre DOIT porter une pastille si au moins un signalement, une vérification ou un retour est en attente.
- **FR-011** : La navigation de l'administration DOIT afficher, à côté de Signalements, Vérifications et Retours, le nombre d'éléments en attente, et rien pour une file vide.
- **FR-012** : Pastille d'accès admin et compteurs DOIVENT être recalculés à chaque navigation et à chaque retour au premier plan, à partir de l'état en base ; aucun canal temps réel ni rafraîchissement périodique n'est attendu pour eux.
- **FR-013** : Aucune information d'administration (pastille, compteur, appel réseau associé) NE DOIT être exposée à un compte sans rôle admin.

**Notifications hors de l'app (stories 4 et 5)**

- **FR-014** : Les paramètres DOIVENT proposer une option « Me prévenir hors de l'app », **désactivée par défaut**, par appareil.
- **FR-015** : La demande d'autorisation système NE DOIT être déclenchée que par l'action explicite de la personne sur cette option — jamais au chargement, jamais par une bannière ou un rappel.
- **FR-016** : Quand l'option est active, un nouveau message reçu DOIT produire une notification au texte générique (« Nouveau message ») sans contenu ni identité de l'expéditeur, qui ouvre la conversation concernée.
- **FR-017** : Quand l'option est active, un nouveau match DOIT produire une notification « Nouveau match » qui ouvre Messages.
- **FR-018** : Pour un compte admin dont l'option est active, un nouveau signalement ou un nouveau retour DOIT produire une notification générique qui ouvre la file concernée ; aucun membre non admin ne reçoit ces notifications.
- **FR-019** : Aucune notification NE DOIT être envoyée pour un like reçu, un croisement, une inactivité ou tout autre événement non listé ici.
- **FR-020** : Aucune notification système NE DOIT s'afficher tant qu'une fenêtre de Libre est au premier plan, quelle que soit la page : la notification système ne sert qu'à qui n'a pas l'app sous les yeux.
- **FR-021** : Une conversation NE DOIT produire qu'une seule notification système tant qu'elle contient des messages non lus : un nouveau message n'en déclenche une que s'il n'existait aucun message non lu avant lui dans cette conversation. La lecture réarme la conversation.
- **FR-022** : La désactivation de l'option, la déconnexion et la suppression du compte DOIVENT retirer l'abonnement de l'appareil concerné (ou de tous, pour la suppression).
- **FR-023** : Un abonnement que la plateforme déclare invalide DOIT être retiré automatiquement lors de la tentative d'envoi.
- **FR-024** : Sur une plateforme qui exige l'installation de l'app (iOS), l'option DOIT expliquer la marche à suivre au lieu d'échouer en silence ; sur un appareil où l'autorisation est refusée, elle DOIT le dire sans réinsister.
- **FR-025** : L'envoi d'un avertissement (temps réel ou notification) est un effet secondaire **best-effort** : sa panne NE DOIT jamais faire échouer l'écriture qui l'a déclenché (message, like, signalement, retour), et DOIT être journalisée sans donnée personnelle.

**Copie et charte**

- **FR-026** : Toute la copie est en français, tutoiement, sans culpabilisation ni incitation au retour (« Nouveau message », jamais « Sam t'attend » ni « Tu as manqué… »).
- **FR-027** : La page Confidentialité DOIT décrire ce que contiennent (et ne contiennent pas) les notifications et ce que le service conserve pour les envoyer.

### Key Entities

- **Message non lu** : un message existant, adressé à la personne, sans date de lecture ; dérivé, non stocké à part.
- **Abonnement de notification** : le lien entre un compte et un appareil qui a accepté de recevoir des notifications ; porte l'adresse d'envoi fournie par la plateforme, ses clés, un identifiant d'appareil lisible, la date de création. Un compte peut en avoir plusieurs ; il disparaît avec le compte.
- **File admin** : l'ensemble des signalements, demandes de vérification et retours en attente ; existant, seulement exposé de nouvelles façons.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** : Une personne sur n'importe quelle page de l'app connectée voit apparaître la pastille Messages dans les 5 secondes suivant la réception d'un message, sans action de sa part.
- **SC-002** : Après lecture de tous ses messages, plus aucune pastille ni badge d'icône ne subsiste, sur aucun appareil, au plus tard au prochain affichage.
- **SC-003** : Aucune surface membre n'affiche de nombre de messages non lus ni de likes reçus — vérifiable par revue de copie et test de non-régression.
- **SC-004** : Sur un compte neuf, aucune demande d'autorisation de notification n'apparaît avant que la personne n'active elle-même l'option.
- **SC-005** : Une personne ayant activé l'option reçoit la notification d'un message dans la minute qui suit son envoi, app fermée, sur Android et sur iOS (app installée) ; la toucher ouvre la bonne conversation.
- **SC-006** : Le texte d'une notification ne contient jamais de contenu de message, de nom d'expéditeur, ni — pour l'admin — de nom de signalé ou de motif.
- **SC-007** : Après un signalement, l'admin voit la pastille d'accès admin dès son prochain changement de page ou retour au premier plan dans l'app membre, sans avoir ouvert l'administration ; le compteur Signalements affiche `1` à l'ouverture de l'administration.
- **SC-008** : Une panne simulée de la couche temps réel ou de notification n'empêche aucun envoi de message, like ou signalement d'aboutir (taux de succès inchangé).
- **SC-009** : Une rafale de dix messages dans une même conversation produit exactement une notification système ; après lecture, le message suivant en produit une nouvelle.

---

## Assumptions

- **Périmètre validé par l'opérateur** le 2026-09-16 : pastille sans chiffre pour les messages ; chiffres autorisés dans l'admin uniquement ; push opt-in y compris pour les files admin ; likes reçus exclus ; match « nouveau » (#161/#195) et son exclus.
- **Découpage en lots** : lot 1 = stories 1, 2, 3 (aucune migration de base) ; lot 2 = stories 4, 5 (une migration additive pour les abonnements). Une issue par story ; le lot 1 peut être livré et utile sans le lot 2.
- **Aucune migration pour le lot 1** : le non-lu est dérivé de la date de lecture existante des messages ; les compteurs admin viennent de l'endpoint de statistiques existant.
- **Abonnements par appareil** : l'option se règle appareil par appareil (c'est ainsi que fonctionnent les autorisations système) ; il n'y a pas de réglage global « tous mes appareils ». Un appareil = un abonnement.
- **Standard Web Push** (VAPID) via le service worker existant, sans fournisseur tiers supplémentaire ; les clés d'envoi sont des secrets d'environnement. Le contrat spec ne dépend pas de ce choix, mais il conditionne le plan.
- **Plateformes** : Android (Chrome, Firefox, Samsung) reçoit les notifications depuis le navigateur ou l'app installée ; iOS 16.4+ uniquement depuis l'app installée. Le badge d'icône n'est garanti que sur l'app installée ; sans nombre, son rendu iOS est minimal — accepté.
- **Événement temps réel de message étendu au destinataire** : aujourd'hui seul le canal de la conversation est notifié ; la story 1 suppose qu'un événement (métadonnées seules, jamais le contenu) atteigne aussi le canal privé du destinataire.
- **Notifications admin** : vont à tous les comptes admin abonnés, sans distribution ni astreinte.
- **Rétention** : un abonnement vit tant que l'appareil répond ; il est supprimé à la première réponse « invalide » de la plateforme, à la désactivation, à la déconnexion et avec le compte.
- **Design** : la pastille (dot de notification) et le compteur de file (chip chiffrée) sont à proposer dans `DESIGN.md` avant tout code (principe IV), puis à valider sur prototype (principe V).
- **#158** est recadrée par cette spec : les critères « son » et « toast in-app "Nouveau message de X" » sont abandonnés (charte) ; les critères « push » et « badge » sont repris par les stories 1, 2, 4.
