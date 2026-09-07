# Plan d'implémentation — Messagerie : E2E par défaut, vault activable

**Spec** : [spec.md](./spec.md) · **Revisé** : 2026-08-28 · **Constitution** : v1.0.0

> Ce plan reflète la décision du 2026-08-28 : la posture par défaut reste le E2E pur ; le vault centralisé est une capacité activable plus tard. Les lots A à E deviennent des capacités techniques préparées mais non activées par défaut.

---

## Contrôle de constitution

| Principe | Impact | Verdict |
|---|---|---|
| I — humain d'abord | Préserve la confidentialité par défaut ; le vault est un confort optionnel. Aucun ressort d'engagement ajouté. | ✅ |
| II — français, copie non excluante | Copie neuve sur l'échec de déchiffrement, la page Confidentialité, et les messages éducatifs anti-arnaque. | ✅ à surveiller en revue de copie |
| III — vie privée, invariant | **Dérogation conditionnelle** : le vault retire le E2E pur, mais uniquement si activé explicitement, avec notification, sans rétroactivité, et sous contrôle juridique. | ⚠️ dérogation tracée et verrouillée |
| IV — Design System | États visuels neufs : message illisible, bandeau vault, alertes anti-arnaque. À proposer dans `DESIGN.md` avant de coder. | ⚠️ tâches dédiées |
| V — le pixel juge | Surfaces touchées : liste de messages, bandeaux, paramètres. Prototype validé puis vérification sur l'app servie. | ⚠️ gates visuels sur Lots 0 et UX |
| VI — ticket / checkpoint | User stories = issues = PR. Tickets créés : #367, #368, #369, #370. | ✅ |

---

## Posture par défaut : E2E pur

La clé privée reste dans le navigateur. Le service ne peut pas lire les messages. Les conséquences :
- changement d'appareil = conversations illisibles (pas perdues silencieusement : signalées comme telles),
- modération uniquement par métadonnées et signalements,
- prévention par éducation dans l'interface.

Le vault est **préparé mais non activé**. Il ne peut être activé que par une action administrative volontaire, documentée, notifiée, et non rétroactive.

---

## Vue technique d'ensemble

```
[Navigateur] ── TLS 1.3 ──► [Next.js / Vercel]
                                    │
                                    ├─► [PostgreSQL / Neon] : messages, métadonnées, clés publiques
                                    │
                                    ├─► [Cloudflare R2] : archives chiffrées (messages + clés)
                                    │
                                    └─► [Vercel env] : CHAT_ESCROW_KEY (absente par défaut)
```

Si `CHAT_ESCROW_KEY` est absente, le mode reste E2E pur. Si `CHAT_ESCROW_KEY` + `ENABLE_CHAT_ESCROW=1` sont définis, le vault est actif pour les **nouvelles** conversations.

---

## Modèle de données

### Mode E2E (actuel, inchangé)

```prisma
model UserKey {
  userId        String   @id @db.Uuid
  publicKey     String
  keyCreatedAt  DateTime @default(now())

  @@map("user_keys")
}
```

### Mode vault (migration additive, préparée mais non appliquée)

```prisma
model UserKey {
  userId              String    @id @db.Uuid
  publicKey           String
  encryptedPrivateKey String?
  escrowedAt          DateTime?
  keyCreatedAt        DateTime  @default(now())

  @@map("user_keys")
}

model UserKeyHistory {
  id                  String    @id @default(uuid()) @db.Uuid
  userId              String    @db.Uuid
  publicKey           String
  encryptedPrivateKey String?
  createdAt           DateTime  @default(now())
  retiredAt           DateTime

  @@map("user_key_history")
}

model ConversationKey {
  id            String   @id @default(uuid()) @db.Uuid
  conversationId String  @db.Uuid
  userId        String   @db.Uuid
  wrappedKey    String
  createdAt     DateTime @default(now())
  keyGeneration Int      @default(1)

  @@unique([conversationId, userId, keyGeneration])
  @@map("conversation_keys")
}

model Message {
  id              String    @id @default(uuid()) @db.Uuid
  conversationId  String    @db.Uuid
  senderId        String    @db.Uuid
  content         String    // ciphertext
  encScheme       Int       @default(1) // 1 = E2E direct, 2 = clé de conversation
  createdAt       DateTime  @default(now())
  readAt          DateTime?
  deletedAt       DateTime?

  @@index([conversationId, createdAt])
  @@map("messages")
}
```

**Règle** : `encScheme` permet de cohabiter sans ré-écrire les messages. Les messages créés avant l'activation du vault restent `encScheme = 1` (E2E pur).

---

## Contrats d'API

### Mode E2E (actuel)

```
POST /api/users/keys
  { publicKey }
  → upsert de la clé publique
```

### Mode vault (préparé)

```
POST /api/users/keys            (extension)
  { publicKey, privateKey? }
  → enveloppe privateKey si fournie
  → REFUSE (400) si privateKey ne correspond pas à publicKey
  → REFUSE (409) si clé publique différente déjà au coffre

GET  /api/users/keys/me         (nouveau)
  → 401 sans session
  → ne renvoie que la clé du compte de la session
  → { publicKey, privateKey } | { publicKey, privateKey: null } | 404
  → rate-limité, Cache-Control: no-store
```

---

## Arbre de décision de useEncryptedChat

```
au montage de useEncryptedChat :

  SI vault inactif (pas de CHAT_ESCROW_KEY) :
    → utiliser la clé locale si elle existe
    → sinon, afficher "illisible" (pas de régénération)

  SI vault actif :
    GET /api/users/keys/me
    ├── coffre garni (publicKey + privateKey)
    │     → clé en mémoire de session
    ├── publicKey connue, coffre vide
    │     ├── clé locale existe ET correspond
    │     │     → POST vers le coffre, puis mémoire
    │     └── sinon
    │           → ÉTAT ILLISIBLE ASSUMÉ : on le dit, on ne régénère RIEN
    └── rien côté serveur (compte neuf ou créé après activation)
          → générer, POST (publique + privée), mémoire
    et si le GET échoue :
          → état dégradé explicite + réessai
```

La branche "sinon" reste la plus importante : elle empêche la destruction silencieuse de l'historique.

---

## Les lots

### Lot 0 — E2E transparent et message illisible (US0, #368)

C'est le MVP immédiat. Le vault n'est pas activé, mais on répare le silence actuel.

- Réécrire `/confidentialite` et les CGU pour dire la vérité du mode E2E.
- `tryDecrypt` ne retourne plus le ciphertext brut : il marque le message comme illisible.
- Afficher l'état illisible dans `ChatMessageList` avec explication.
- Purger la clé privée et le cache clair à la déconnexion.
- Test de non-régression sur `/confidentialite` (FR-011 / #328).
- Playwright : vider le stockage local → messages signalés comme illisibles.

**Démonstration** : se connecter, échanger des messages, vider le stockage, recharger : les messages affichent "illisible" avec explication.

---

### Lot UX — Prévention des arnaques et signalement simplifié (#369)

Sans lire le contenu, on réduit l'exposition aux arnaques par éducation et signalement.

- Bulle d'information anti-arnaque dans les nouvelles conversations.
- Rappel contextuel sur profils à risque (nouvel inscrit, conversation rapide).
- Bouton de signalement dans chaque message et dans l'en-tête de conversation.
- Formulaire de signalement avec motifs adaptés.
- Tests sur les composants et le formulaire.

**Démonstration** : signaler un message ; l'admin reçoit le signalement avec métadonnées, sans contenu.

---

### Lot Capacité A — Escrow technique (#198, à réactiver quand le vault est activé)

Préparer le code du vault sans l'activer.

- `src/lib/crypto-escrow.ts` (`import 'server-only'`) : `wrapPrivateKey` / `unwrapPrivateKey`.
- Enveloppe `v1:` pour future rotation.
- Migrations additives : `encryptedPrivateKey`, `escrowedAt`, `user_key_history`, `conversation_keys`, `messages.encScheme`.
- `GET /api/users/keys/me` + extension du `POST`.
- Test de garde : `crypto-escrow` ne doit jamais atteindre le bundle client.
- `CHAT_ESCROW_KEY` dans `.env.example` avec documentation.

**Important** : ce code ne s'exécute pas en production tant que `CHAT_ESCROW_KEY` n'est pas définie.

---

### Lot Capacité B — Migration douce (#336, à réactiver)

Quand le vault est activé, verser les clés locales existantes au coffre.

- Branche « publicKey connue, coffre vide, clé locale correspondante ».
- Journalisation sans PII des issues de migration.
- Test : `localStorage` d'avant, puis lecture depuis un autre navigateur.

---

### Lot Capacité C — Rotation de clés et conversations historiques (#199)

Permettre une rotation sans perdre l'historique.

- Tables `user_key_history` et `conversation_keys`.
- Rotation = archiver, publier, ré-envelopper. Aucun message ré-chiffré.
- Lecture selon `encScheme`.
- Test : rotation provoquée, fil antérieur lisible.

---

### Lot Capacité D — Purge réelle et rétention (#202)

Définir et appliquer la durée de conservation.

- Effacement d'un message : pierre tombale + destruction du ciphertext après fenêtre de modération.
- Rupture de match / suppression de compte : cascade conversation, messages, clés de conversation, coffre.
- Purge périodique via cron Vercel.
- **Préalable** : trancher la durée avec un juriste (cf. `legal-brief.md`).

---

### Lot Capacité E — Indicateurs de risque (#370)

Même en E2E pur, détecter les usages suspects par métadonnées.

- Table `MessageRiskSignal` sans PII.
- Scoring basé sur volume, signalements, patterns, nouveauté du compte.
- Dashboard admin avec alertes.
- Journalisation des décisions.

---

## Procédures d'exploitation

### Activation du vault

1. **Décision documentée** : raison (modération impossible, obligation légale, etc.).
2. **Génération de `CHAT_ESCROW_KEY`** : 32 octets base64, jamais dans le dépôt.
3. **Sauvegarde hors ligne** : copie chiffrée dans un support physique sécurisé.
4. **Notification** : e-mail + bandeau aux utilisateurs actifs ; mise à jour des CGU.
5. **Déploiement** : activer `ENABLE_CHAT_ESCROW=1` sur Vercel.
6. **Vérification** : tests sur comptes de test ; anciennes conversations restent E2E pur.
7. **Journalisation** : consigner l'activation dans les logs d'audit.

### Export d'urgence

1. **Motif** : réquisition, signalement grave, détournement avéré.
2. **Validation** : double validation si possible, documentée.
3. **Exécution** : script admin qui restitue les clés et déchiffre uniquement les messages ciblés.
4. **Journalisation** : tout est tracé.
5. **Conservation** : l'export est détruit dès que possible.

---

## Guide de validation

### Pour le Lot 0 (E2E transparent)

```sh
npx vitest run
npx tsc --noEmit
npx eslint
```

Sur l'app servie :
1. Se connecter, échanger des messages.
2. Vider le stockage local, recharger.
3. Vérifier que les anciens messages s'affichent comme **illisibles**, jamais en clair.
4. Vérifier que la page Confidentialité dit la vérité.

### Pour les capacités vault (quand activé)

```sh
npx vitest run
npx tsc --noEmit
npx eslint
npm run build
```

Sur l'app servie :
1. Activer le vault sur un compte de test.
2. Échanger des messages.
3. Vider le stockage local, recharger → messages toujours là.
4. Vérifier que les conversations antérieures à l'activation restent illisibles.

---

**Exécuté le 2026-08-17** sur PostgreSQL local (`libre_e2e_198`) + `next dev`,
deux comptes appariés, Playwright piloté à la main : clé versée au coffre au
premier chargement (`GET /api/users/keys/me` → `privateKey` présente), message
servi chiffré par l'API, `localStorage` intégralement vidé (dont le cache clair),
message relu en clair après rechargement, zéro bulle « illisible ». Le gate a
aussi révélé un défaut d'empilement préexistant du composer mobile → #339.

## Risques

| Risque | Parade |
|---|---|
| Perte de `CHAT_ESCROW_KEY` | Sauvegarde hors ligne obligatoire ; procédure de rotation. |
| Activation rétroactive ou silencieuse | `ENABLE_CHAT_ESCROW` explicite, notification utilisateurs, `encScheme` comme frontière. |
| Régénération silencieuse | Arbre de décision : ne jamais générer quand une clé publique est connue. |
| Coffre empoisonné | Vérification privée ↔ publique au `POST` ; refus `409` si clé différente. |
| Cache clair après déconnexion | Purge explicite testée. |
| Scan massif du contenu | Interdit par conception, même en vault. Seuls signalements + métadonnées. |
| Exposition juridique du vault | Avis juridique préalable ; CGU à jour. |

---

## Séquencement

```
Lot 0 (E2E transparent) ──► Lot UX (prévention arnaques + signalement)
        │
        ▼
Lot Capacité A (escrow technique) ──► Lot Capacité B (migration)
        │
        ▼
Lot Capacité C (rotation) ──► Lot Capacité D (purge / rétention)
        │
        ▼
Lot Capacité E (indicateurs de risque)  [peut être mené en parallèle]
```

Les **capacités vault (A-D) ne sont pas activées en production** tant que le contexte produit/juridique ne l'exige pas. Elles sont préparées, testées, mais verrouillées par l'absence de `CHAT_ESCROW_KEY`.

Les tickets store-readiness (#367) et indicateurs de risque (#370) peuvent avancer indépendamment.

---

## Références

- `spec.md` : spécification fonctionnelle revue
- `vault-security.md` : architecture technique du vault
- `legal-brief.md` : questions juridiques et store-readiness
- `store-readiness.md` : plan des 5 actions prioritaires pour les stores
