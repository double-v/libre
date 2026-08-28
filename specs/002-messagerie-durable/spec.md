# Feature Specification: Messagerie privée — E2E par défaut, vault activable

**Feature Branch**: `002-messagerie-durable`

**Created**: 2026-08-17

**Revised**: 2026-08-28

**Status**: Clarifié et revu — prêt pour le plan

**Épic**: #197 — couvre #198 (escrow de clé), #199 (clé de conversation et historique), #202 (rétention et messages éphémères)

**Input** : discussion opérateur du 2026-08-28 : la posture par défaut reste le E2E pur ; le vault centralisé est une capacité activable plus tard, avec reset des conversations, archives sécurisées et transparence totale.

---

## Contexte

Aujourd'hui, la clé privée qui déchiffre les messages n'existe **que** dans le navigateur qui l'a créée : `useEncryptedChat` la range dans `localStorage` (`libre_private_key`), chiffrée par une « clé d'appareil » rangée… dans le même `localStorage` (`libre_device_key`). Cette enveloppe ne protège donc de rien d'autre que d'un coup d'œil distrait, et surtout elle ne voyage pas.

Conséquence, vérifiable en trois clics : changer de téléphone, vider le cache, ouvrir une fenêtre privée ou simplement changer de navigateur suffit à **perdre définitivement l'intégralité de ses conversations**. Le code régénère une paire, pousse la nouvelle clé publique sur `POST /api/users/keys` — qui fait un `upsert` et **écrase** l'ancienne, sans en garder trace — et l'ancien fil devient un mur de caractères illisibles. Le pair est touché lui aussi.

Le pire est le silence. Quand le déchiffrement échoue, le `catch` retombe en « pas de chiffrement » et l'application continue comme si de rien n'était. La personne ne sait pas qu'elle vient de perdre quelque chose.

Sur une application dont la messagerie est l'aboutissement du parcours, c'est une perte de données silencieuse au cœur du produit.

### Posture retenue

Après discussion, la posture par défaut reste le **chiffrement de bout en bout pur** : le service ne peut pas lire les messages, et c'est assumé. En contrepartie, les messages ne sont pas portables au changement d'appareil.

Un **vault centralisé** est toutefois prévu comme **capacité activable** si la modération au fil de l'eau devient impossible ou si une obligation légale l'impose. Son activation :
- nécessite une action volontaire et documentée de l'administrateur,
- **ne s'applique qu'aux conversations créées après l'activation** (pas de lecture rétroactive),
- est **notifiée explicitement** aux utilisateurs via les CGU et un bandeau,
- est **tracée et journalisée**.

Cette approche préserve la confiance aujourd'hui tout en gardant un levier de sécurité et de conformité pour demain.

---

## User Scenarios & Testing *(mandatory)*

### User Story 0 — Messagerie sûre et transparente en mode E2E (Priority: P1)

Aujourd'hui, les messages sont chiffrés de bout en bout. Le service ne peut techniquement pas les lire. L'utilisateur est informé clairement de cette posture et de ses conséquences : si l'appareil est perdu ou le cache vidé, les conversations ne sont pas récupérables.

**Why this priority** : c'est la posture actuelle. Elle doit être dite, cohérente avec le code, et maintenue tant que le vault n'est pas activé.

**Independent Test** : lire la page Confidentialité et confronter chaque phrase au comportement réel. Aucune phrase ne doit promettre plus que ce que le code garantit.

**Acceptance Scenarios** :

1. **Given** la page Confidentialité, **When** on la lit, **Then** elle indique sans ambiguïté que les messages sont chiffrés de bout en bout et que le service ne peut pas les lire actuellement.
2. **Given** un utilisateur qui change d'appareil sans vault actif, **When** il ouvre ses conversations, **Then** elles apparaissent comme illisibles (et non pas en clair ou silencieusement perdues).
3. **Given** un message que l'application ne parvient pas à déchiffrer, **When** il s'affiche, **Then** il est signalé comme illisible avec une explication.

---

### User Story 1 — Changer de téléphone sans rien perdre (Priority: P1, vault activé)

Une personne change de téléphone, ou vide le cache de son navigateur, ou se reconnecte depuis son ordinateur. Le vault est actif. Elle ouvre Messages : ses conversations sont là, lisibles, exactement comme sur l'appareil précédent. Elle n'a rien eu à sauvegarder.

**Why this priority** : c'est le cœur de la valeur du vault. Sans ce récit, le vault ne sert à rien.

**Independent Test** : se connecter depuis un second navigateur après activation du vault, ouvrir une conversation existante : les messages s'affichent en clair.

**Acceptance Scenarios** :

1. **Given** un compte avec vault actif qui a déjà échangé des messages, **When** il se connecte depuis un appareil neuf, **Then** l'intégralité de son historique s'affiche en clair.
2. **Given** une session ouverte, **When** la personne se déconnecte, **Then** la clé privée et le cache clair ne subsistent pas sur l'appareil.
3. **Given** une requête de restitution de clé sans session valide, **When** elle est reçue, **Then** elle est refusée.
4. **Given** une session valide, **When** elle demande sa clé, **Then** le service ne restitue que la clé de ce compte.

---

### User Story 2 — Activation du vault sans perte de confiance (Priority: P1)

L'administrateur décide d'activer le vault. Les utilisateurs sont informés. Les conversations créées avant l'activation restent en mode E2E pur (illisibles au changement d'appareil). Les nouvelles conversations bénéficient du vault.

**Why this priority** : activer le vault rétroactivement briserait la confiance. La frontière doit être claire et dicible.

**Independent Test** : activer le vault sur un compte avec des conversations anciennes et nouvelles ; vider le stockage ; vérifier que seules les nouvelles restent lisibles.

**Acceptance Scenarios** :

1. **Given** une activation du vault, **When** elle se produit, **Then** un bandeau + e-mail informent les utilisateurs actifs.
2. **Given** une conversation créée avant l'activation, **When** l'utilisateur change d'appareil, **Then** elle est marquée illisible (pas de portage rétroactif).
3. **Given** une conversation créée après l'activation, **When** l'utilisateur change d'appareil, **Then** elle reste lisible.
4. **Given** un compte créé après activation, **When** il échange des messages, **Then** sa clé privée est automatiquement versée au coffre.

---

### User Story 3 — Les comptes déjà là ne perdent rien au passage (Priority: P2, vault activé)

Les personnes qui utilisent déjà Libre détiennent leur clé sur leur appareil. Si le vault est activé, leur clé locale rejoint le coffre au premier chargement, sans écran ni question. Leurs nouvelles conversations deviennent portables.

**Acceptance Scenarios** :

1. **Given** un compte dont la clé est locale et le vault vient d'être activé, **When** il ouvre l'application, **Then** sa clé rejoint le coffre et ses futures conversations sont portables.
2. **Given** la migration déjà faite, **When** la personne recharge, **Then** elle n'est pas rejouée.
3. **Given** un compte dont la clé publique est connue mais dont aucune clé n'est au coffre, **When** il ouvre l'application depuis un appareil qui ne détient pas la clé correspondante, **Then** le système ne régénère pas de nouvelle paire : il signale l'illisible.

---

### User Story 4 — Rotation de clé sans perdre l'historique (Priority: P3, vault activé)

Une clé change — compte compromis, réinitialisation, incident. Les conversations du vault d'avant continuent de s'ouvrir. La rotation protège la suite sans effacer le passé.

**Acceptance Scenarios** :

1. **Given** une conversation antérieure à une rotation, **When** on l'ouvre après la rotation, **Then** les anciens messages sont lisibles.
2. **Given** une rotation, **When** un message est envoyé ensuite, **Then** il est protégé par la nouvelle clé.
3. **Given** une clé publique remplacée, **When** on consulte l'historique, **Then** l'ancienne est conservée et datée.

---

### User Story 5 — Effacer pour de bon (Priority: P3)

Une personne veut qu'un message cesse d'exister. Elle l'efface : il disparaît des deux côtés, ne laissant qu'une trace neutre « message supprimé ». Quand un match se rompt, la conversation part avec lui — pour de bon.

**Acceptance Scenarios** :

1. **Given** un message effacé par son auteur, **When** le pair recharge, **Then** il voit une trace neutre et le contenu n'est plus restituable.
2. **Given** un match rompu, **When** la purge passe, **Then** la conversation et ses messages ne sont plus restituables.
3. **Given** un compte supprimé, **When** on interroge l'export RGPD ou l'administration, **Then** ni ses messages ni sa clé au coffre ne subsistent.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** (E2E) : Par défaut, le service ne peut pas lire le contenu des messages. La page Confidentialité et les CGU reflètent cette posture.
- **FR-002** (vault activable) : Le vault est activé uniquement si `CHAT_ESCROW_KEY` et `ENABLE_CHAT_ESCROW=1` sont définis.
- **FR-003** (reset à l'activation) : L'activation du vault ne porte que sur les conversations créées après activation. Les conversations antérieures restent en E2E pur.
- **FR-004** (notification) : L'activation du vault est notifiée aux utilisateurs actifs (bandeau + e-mail) et consignée dans les CGU.
- **FR-005** (portabilité vault) : Une fois le vault actif, les conversations créées sous vault sont lisibles depuis n'importe quel appareil authentifié, sans action utilisateur.
- **FR-006** (session) : La restitution de la clé exige une session authentifiée et ne restitue que la clé du compte de la session.
- **FR-007** (clé privée jamais en clair) : La clé privée n'est jamais stockée en clair en base ; le navigateur ne reçoit jamais la clé maître.
- **FR-008** (pas de régénération silencieuse) : Le système ne régénère jamais une paire de clés pour un compte qui en possède déjà une. En cas d'impossibilité, il échoue visiblement.
- **FR-009** (message illisible visible) : Un échec de déchiffrement est signalé comme tel, jamais avalé silencieusement.
- **FR-010** (migration douce) : Les comptes existants versent leur clé locale au coffre au premier chargement après activation du vault, sans perdre de fil.
- **FR-011** (rotation) : Une rotation de clé ne rend illisible aucun message antérieur du vault.
- **FR-012** (purge réelle) : La rupture d'un match et la suppression d'un compte détruisent effectivement la conversation, les messages, les clés de conversation et le coffre.
- **FR-013** (rétention) : Les messages sont conservés tant que le match vit. Après rupture ou suppression de compte, ils sont purgés après une fenêtre de conservation pour la modération (durée à trancher juridiquement).
- **FR-014** (transparence) : Les CGU et la page Confidentialité décrivent à tout moment la posture réelle du service (E2E ou vault actif).
- **FR-015** (indicateurs de risque) : En mode E2E, le service dispose d'indicateurs de risque basés sur les métadonnées (volume, signalements, patterns) sans jamais lire le contenu.
- **FR-016** (journalisation) : Tout accès administratif au contenu des messages, s'il existe, est journalisé.
- **FR-017** (best-effort) : Aucune écriture déjà actée n'est annulée par un effet de bord ultérieur (notification, temps réel).

### Key Entities

- **Mode E2E** : posture par défaut. Clé privée uniquement dans le navigateur. Aucune portabilité.
- **Mode vault** : posture activable. Clé privée chiffrée au coffre côté service. Portabilité des nouvelles conversations.
- **Coffre (escrow)** : enveloppe `AES-256-GCM` protégée par la clé maître. Ouverte uniquement côté service.
- **Clé de conversation** : clé symétrique d'un fil, enveloppée pour chaque participant. Permet la rotation sans ré-chiffrer les messages.
- **Message** : porte `content` (ciphertext), `deletedAt`, `encScheme` (1 = E2E direct, 2 = clé de conversation).

---

## Success Criteria *(mandatory)*

- **SC-001** : En mode E2E, la page Confidentialité et les CGU ne promettent pas plus que ce que le code garantit (test de non-régression par route).
- **SC-002** : Un message illisible est signalé comme tel dans 100 % des cas.
- **SC-003** : Une activation du vault est notifiée et documentée, et ne rend pas rétroactivement lisibles les conversations antérieures.
- **SC-004** : En mode vault, 100 % des conversations créées après activation restent lisibles au changement d'appareil.
- **SC-005** : Une rotation de clé en mode vault ne rend illisible aucun message antérieur.
- **SC-006** : Ce qu'une personne efface ou qui est purgé après rupture n'est restituable par aucun chemin.
- **SC-007** : Les indicateurs de risque en mode E2E ne reposent jamais sur le contenu des messages.

---

## Assumptions

- Le mode par défaut reste **E2E pur** tant que le vault n'est pas explicitement activé.
- L'activation du vault est une **décision administrative documentée**, pas une bascule technique invisible.
- Le volume actuel permet une migration en une seule passe ; à grande échelle, une migration progressive serait nécessaire.
- La clé maître reste dans l'environnement Vercel (mode freetier). Une migration vers un KMS externe est prévue dans la feuille de route sécurité.
- L'archive des messages et des clés se fait sur **R2** (déjà utilisé pour les photos), sous forme de ciphertexts chiffrés.
- La durée de conservation post-rupture est un paramètre produit/juridique, pas technique.

---

## Dépendances

- **#198** — escrow de clé : socle du mode vault.
- **#199** — clé de conversation et historique de clés : socle de la rotation.
- **#202** — rétention et purge réelle.
- **#200 / PR #254 / PR #303** — pagination, déchiffrement paresseux, virtualisation : déjà livrés.
- **#328** — promesse affichée adossée à du code et testée par route.
- **#160** — suppression de compte en cascade.

---

## Décisions tranchées *(2026-08-28)*

| # | Question | Décision | Ce qu'on écarte et pourquoi |
|---|---|---|---|
| 1 | Mode par défaut | **E2E pur** par défaut ; vault activable | Le vault par défaut briserait la promesse de confidentialité et exposerait juridiquement le service, pour un besoin de portabilité qui ne concerne pas tous les utilisateurs aujourd'hui. |
| 2 | Activation du vault | **Action explicite + notification + pas de rétroactivité** | Une activation silencieuse ou rétroactive serait un défaut de confiance et un risque juridique. |
| 3 | Stockage de la clé maître | **Vercel env par défaut**, migration KMS prévue | Freetier, seul aux manettes, 23 inscrits. AWS KMS ou matos perso sont hors budget/portée immédiate, mais documentés comme évolution. |
| 4 | Archives | **R2, ciphertexts chiffrés**, rotation possible | Même fournisseur que les photos, 10 Go/mois free, pas de matos perso. Les archives restent du chiffré. |
| 5 | Rétention post-rupture | **À trancher avec un juriste** ; placeholder 30 jours | Ni illimitée (risque RGPD), ni nulle (modération / réquisition). |
| 6 | Indicateurs de risque E2E | **Métadonnées uniquement** : volume, signalements, patterns | Lire le contenu en E2E pur est techniquement impossible ; les indicateurs permettent quand même une modération proactive. |
| 7 | Scan de contenu | **Jamais de scan automatique massif**, même en vault activé | Exemple type : l'envoi d'une clé de wallet BTC en message privé n'est détectable qu'après signalement ou avec vault activé + scan ciblé validé par un humain. Le scan massif serait disproportionné au regard du RGPD et faux-positif. |
| 8 | Store-readiness | **À planifier** : positionnement bienveillant, flou photos, age gate, privacy policy, compte demo | Nécessaire pour un jour soumettre l'app sur Play Store / App Store, faisable en freetier. |

---

## Notes spécifiques au store-readiness

Pour un jour publier Libre sur les stores, les points suivants doivent être tenus :

1. **Positionnement bienveillant** : le marketing et la description de l'app doivent mettre en avant la rencontre respectueuse, pas le contenu adulte. Éviter les termes « hookup », « anonyme », « hot-or-not ».
2. **Flou par défaut des photos sensibles** : maintenir le voile et la révélation explicite. Les photos explicites doivent être masquées par défaut et accessibles uniquement après action volontaire.
3. **Age gate solide** : vérification 18+ à l'inscription, avec confirmation par date de naissance et éventuellement vérification d'identité (selfie). Interdiction stricte aux mineurs.
4. **Politique de confidentialité à jour** : refléter le mode E2E par défaut, la possibilité d'activation du vault, les métadonnées collectées, les durées de conservation.
5. **Compte demo pour le review** : compte fictif avec profils, matchs et conversations factices, accessible par Apple/Google lors du review.

Ces points feront l'objet d'une planification dédiée et de tickets séparés.
