# Feature Specification: Messagerie privée durable — vault actif par défaut

**Feature Branch**: `002-messagerie-durable`

**Created**: 2026-08-17

**Revised**: 2026-08-29

**Status**: Réconcilié avec `main` — prêt pour la suite

**Épic**: #197 — couvre #198 (escrow de clé), #199 (clé de conversation et historique), #202 (rétention et purge réelle)

**Input** : discussion opérateur du 2026-08-29 : le vault est désormais actif par défaut dans l'implémentation (`main`). La spec doit servir à solidifier le système et à garantir la conformité store-readiness.

---

## Contexte

Le vault centralisé est **activé par défaut** dans l'implémentation actuelle de Libre. Cela signifie que :
- la clé privée de messagerie de chaque compte est conservée chiffrée côté service (`encryptedPrivateKey` dans `user_keys`),
- les messages restent lisibles au changement d'appareil,
- le service dispose techniquement de la capacité de déchiffrer les messages,
- cette capacité est assumée, journalisée, et encadrée par les CGU.

Cette posture a été choisie pour concilier :
- **la portabilité** des conversations (changement d'appareil sans perte),
- **la modération proactive** (détection d'abus sur signalement),
- **la conformité** avec d'éventuelles obligations légales,
- **la transparence** envers les utilisateurs.

Le coût est un départ du pur zéro-knowledge. Cet arbitrage n'est acceptable que s'il est **dit clairement** dans l'interface, les CGU et la politique de confidentialité.

---

## User Scenarios & Testing *(mandatory)*

### User Story 0 — Messagerie sûre et transparente (Priority: P1)

Aujourd'hui, les messages sont chiffrés en transit et au repos. Le service conserve la clé nécessaire pour les rendre portables : l'équipe technique peut techniquement y accéder, uniquement dans les cas prévus par les CGU. L'utilisateur est informé clairement de cette posture.

**Why this priority** : c'est la posture actuelle. Elle doit être dite, cohérente avec le code, et maintenue.

**Independent Test** : lire la page Confidentialité et confronter chaque phrase au comportement réel. Aucune phrase ne doit promettre moins ni plus que ce que le code garantit.

**Acceptance Scenarios** :

1. **Given** la page Confidentialité, **When** on la lit, **Then** elle indique sans ambiguïté que le service peut techniquement déchiffrer les messages et pourquoi.
2. **Given** une conversation, **When** on l'ouvre, **Then** un bandeau rappelle la posture E2E/vault.
3. **Given** un message que l'application ne parvient pas à déchiffrer sur cet appareil, **When** il s'affiche, **Then** il est signalé comme illisible avec une explication.

---

### User Story 1 — Changer de téléphone sans rien perdre (Priority: P1)

Une personne change de téléphone, ou vide le cache de son navigateur, ou se reconnecte depuis son ordinateur. Elle ouvre Messages : ses conversations sont là, lisibles. Elle n'a rien eu à sauvegarder.

**Acceptance Scenarios** :

1. **Given** un compte qui a déjà échangé des messages, **When** il se connecte depuis un appareil neuf, **Then** l'intégralité de son historique s'affiche en clair.
2. **Given** une session ouverte, **When** la personne se déconnecte, **Then** le cache clair des messages ne subsiste pas sur l'appareil.
3. **Given** une requête de restitution de clé sans session valide, **When** elle est reçue, **Then** elle est refusée.
4. **Given** une session valide, **When** elle demande sa clé, **Then** le service ne restitue que la clé de ce compte.

---

### User Story 2 — Migration douce des clés locales (Priority: P2)

Les comptes créés avant l'activation du vault détiennent encore leur clé uniquement dans le navigateur. Au premier chargement, cette clé rejoint le coffre sans que l'utilisateur s'en aperçoive. Ses anciens fils continuent de s'ouvrir.

**Acceptance Scenarios** :

1. **Given** un compte dont la clé est locale, **When** il ouvre l'application, **Then** sa clé rejoint le coffre et ses conversations restent lisibles, sans écran ni question.
2. **Given** un compte dont la clé publique est connue mais dont aucune clé n'est encore au coffre, **When** il ouvre l'application depuis un appareil qui ne détient pas la clé correspondante, **Then** le système ne régénère pas de nouvelle paire : il signale l'illisible.
3. **Given** la migration déjà faite, **When** la personne recharge, **Then** elle n'est pas rejouée.

---

### User Story 3 — Rotation de clé sans perdre l'historique (Priority: P3)

Une clé change — compte compromis, réinitialisation, incident. Les conversations d'avant continuent de s'ouvrir. La rotation protège la suite sans effacer le passé.

**Acceptance Scenarios** :

1. **Given** une conversation antérieure à une rotation, **When** on l'ouvre après la rotation, **Then** les anciens messages sont lisibles.
2. **Given** une rotation, **When** un message est envoyé ensuite, **Then** il est protégé par la nouvelle clé.
3. **Given** une clé publique remplacée, **When** on consulte l'historique, **Then** l'ancienne est conservée et datée.

---

### User Story 4 — Effacer pour de bon (Priority: P3)

Une personne veut qu'un message cesse d'exister. Elle l'efface : il disparaît des deux côtés, ne laissant qu'une trace neutre « message supprimé ». Quand un match se rompt, la conversation part avec lui — pour de bon.

**Acceptance Scenarios** :

1. **Given** un message effacé par son auteur, **When** le pair recharge, **Then** il voit une trace neutre et le contenu n'est plus restituable.
2. **Given** un match rompu, **When** la purge passe, **Then** la conversation et ses messages ne sont plus restituables.
3. **Given** un compte supprimé, **When** on interroge l'export RGPD ou l'administration, **Then** ni ses messages ni sa clé au coffre ne subsistent.

---

### User Story 5 — Modération proactive par métadonnées (Priority: P2)

Même sans lire le contenu en continu, le service dispose d'indicateurs de risque basés sur les métadonnées (volume, signalements, patterns). Un humain peut être alerté et agir.

**Acceptance Scenarios** :

1. **Given** un profil avec un comportement suspect (nouvel inscrit qui contacte beaucoup de monde rapidement), **When** il dépasse un seuil, **Then** un administrateur reçoit une alerte.
2. **Given** un signalement, **When** il est reçu, **Then** l'administrateur peut consulter les métadonnées associées sans action préalable.
3. **Given** une alerte, **When** l'administrateur y répond, **Then** sa décision est journalisée.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** : Les messages sont chiffrés en transit (TLS 1.3) et au repos (base chiffrée).
- **FR-002** : La clé privée de chaque utilisateur est stockée chiffrée au coffre ; jamais en clair en base, jamais exposée au navigateur.
- **FR-003** : Les conversations sont lisibles depuis n'importe quel appareil authentifié, sans action utilisateur.
- **FR-004** : La restitution de la clé exige une session authentifiée et ne restitue que la clé du compte de la session.
- **FR-005** : Le système ne régénère jamais une paire de clés pour un compte qui en possède déjà une. En cas d'impossibilité, il échoue visiblement.
- **FR-006** : Un échec de déchiffrement est signalé comme tel, jamais avalé silencieusement.
- **FR-007** : Les comptes existants dont la clé est locale la versent au coffre au premier chargement, sans perdre de fil.
- **FR-008** : Une rotation de clé ne rend illisible aucun message antérieur.
- **FR-009** : Les pages Confidentialité et CGU décrivent la posture réelle : chiffrement + accès techniquement possible par le service.
- **FR-010** : Toute promesse de confidentialité affichée est adossée à un test de non-régression sur la route qui la tient (corollaire #328).
- **FR-011** : Les messages sont conservés tant que le match vit. Après rupture ou suppression de compte, purge effective après une fenêtre de conservation pour la modération (durée à trancher juridiquement).
- **FR-012** : L'effacement d'un message par son auteur vaut pour les deux personnes et laisse une trace neutre.
- **FR-013** : Le service dispose d'indicateurs de risque sur métadonnées sans lire le contenu en continu.
- **FR-014** : Tout accès administratif au contenu des messages est journalisé.
- **FR-015** : Aucune écriture déjà actée n'est annulée par un effet de bord ultérieur.

### Security Requirements

- **SR-001** : La clé maître (`CHAT_ESCROW_KEY`) ne transite jamais dans le dépôt, jamais vers le client.
- **SR-002** : Variables d'environnement Production / Preview / Development séparées.
- **SR-003** : Sauvegarde hors ligne de la clé maître.
- **SR-004** : `crypto-escrow.ts` est marqué `import 'server-only'`.
- **SR-005** : Journalisation de toute activation, restitution, rotation et export d'urgence.

---

## Success Criteria

- **SC-001** : Zéro conversation perdue lors d'un changement d'appareil.
- **SC-002** : Aucune action utilisateur nécessaire pour retrouver ses messages.
- **SC-003** : La page Confidentialité correspond au comportement réel du code.
- **SC-004** : Un message illisible est signalé comme tel dans 100 % des cas.
- **SC-005** : Une rotation de clé ne rend illisible aucun message antérieur.
- **SC-006** : Ce qui est effacé ou purgé n'est restituable par aucun chemin.
- **SC-007** : Les indicateurs de risque ne reposent jamais sur le contenu des messages.

---

## Architecture technique

Voir `vault-security.md` pour le détail. Points clés :
- `crypto-escrow.ts` (`server-only`) : `wrapPrivateKey` / `unwrapPrivateKey` en AES-256-GCM.
- Stockage des clés : `user_keys.encryptedPrivateKey`.
- Historique : `user_key_history`.
- Clés de conversation : `conversation_keys`.
- `messages.encScheme` : `1` = E2E direct historique, `2` = clé de conversation.
- Archives : Cloudflare R2, ciphertexts chiffrés.
- Clé maître : Vercel env (freetier), évolution vers KMS prévue.

---

## Décisions tranchées

| # | Sujet | Décision |
|---|---|---|
| 1 | Vault par défaut | **Actif** dans l'implémentation actuelle. La spec s'y aligne. |
| 2 | Chiffrement | E2E en transit, chiffré au repos, clé maître côté service. |
| 3 | Portabilité | Oui, grâce au coffre. |
| 4 | Accès service | Techniquement possible, encadré par CGU, journalisé. |
| 5 | Rétention | Tant que le match vit ; purge effective après rupture/suppression avec fenêtre de modération. |
| 6 | Scan de contenu | **Jamais automatique ni massif**. Signalements + métadonnées uniquement. |
| 7 | Store-readiness | Positionnement bienveillant, flou photos, age gate, privacy policy, compte demo. |

---

## Notes spécifiques au store-readiness

1. **Positionnement bienveillant** : rencontre respectueuse, pas app adulte.
2. **Flou par défaut des photos sensibles** : révélation explicite.
3. **Age gate / vérification 18+** : date de naissance + badge vérifié.
4. **Politique de confidentialité à jour** : posture E2E/vault claire.
5. **Compte demo pour le review** : profils, matchs, conversations factices.

Ces points sont trackés dans `store-readiness.md` et le ticket #367.

---

## Dépendances

- #198, #199, #202 implémentés dans `main`.
- #328 : promesse affichée adossée à du code et testée par route.
- #367 : store-readiness.
- #370 : indicateurs de risque.
