# Architecture du vault — mode freetier

**Date** : 2026-08-28

**Contexte** : spécification de l'architecture technique du vault centralisé de Libre, dans une contrainte de coût freetier et sans engagement de matériel personnel. Le vault reste désactivé par défaut ; ce document décrit comment il serait construit et sécurisé si activé.

---

## Principes de sécurité

1. **Défense en profondeur** : plusieurs couches de protection, aucun point unique facilement exploitable.
2. **Moindre privilège** : seuls les processus qui en ont besoin peuvent accéder à la clé maître.
3. **Chiffrement sur chiffrement** : les archives contiennent du ciphertext, jamais de clair.
4. **Traçabilité** : tout accès au vault et toute restitution de clé sont journalisés.
5. **Honneteté technique** : on ne promet pas plus que ce qu'on peut tenir.

---

## Vue d'ensemble

```
[Navigateur] ── TLS 1.3 ──► [Next.js / Vercel]
                                    │
                                    ├─► [PostgreSQL / Neon] : messages, métadonnées
                                    │
                                    ├─► [Cloudflare R2] : archives de messages + archives de clés
                                    │     (tout chiffré avec la clé maître)
                                    │
                                    └─► [Vercel env] : CHAT_ESCROW_KEY
```

Le vault est **activé par défaut** dans l'implémentation actuelle. La clé maître vit dans une variable d'environnement Vercel. Ce n'est pas l'idéal, mais c'est acceptable à petite échelle avec des procédures strictes. L'évolution vers un KMS (AWS KMS, Google Cloud KMS) est documentée comme next step.

## Modèles de données

### Mode E2E (actuel)

```prisma
model UserKey {
  userId        String   @id @db.Uuid
  publicKey     String
  keyCreatedAt  DateTime @default(now())

  @@map("user_keys")
}
```

### Mode vault (quand activé)

```prisma
model UserKey {
  userId              String    @id @db.Uuid
  publicKey           String
  encryptedPrivateKey String?   // clé privée sous enveloppe de la clé maître
  escrowedAt          DateTime?
  keyCreatedAt        DateTime  @default(now())

  @@map("user_keys")
}

model UserKeyHistory {
  id                String    @id @default(uuid()) @db.Uuid
  userId            String    @db.Uuid
  publicKey         String
  encryptedPrivateKey String?
  createdAt         DateTime  @default(now())
  retiredAt         DateTime

  @@map("user_key_history")
}

model ConversationKey {
  id              String   @id @default(uuid()) @db.Uuid
  conversationId  String   @db.Uuid
  userId          String   @db.Uuid
  wrappedKey      String   // clé de conversation enveloppée pour ce participant
  createdAt       DateTime @default(now())
  keyGeneration   Int      @default(1)

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

### Notes

- `encryptedPrivateKey` est du **ciphertext** produit par `crypto-escrow.ts`.
- `ConversationKey.wrappedKey` est une clé de conversation symétrique chiffrée avec la clé publique de l'utilisateur (pour l'archivage) ou dérivée via ECDH.
- `encScheme` permet de distinguer les anciens messages E2E des messages vault sans ré-écriture.

---

## Module crypto-escrow

### Emplacement

`src/lib/crypto-escrow.ts` avec `import 'server-only'`.

### Interface

```ts
export function wrapPrivateKey(privateKey: string): string;
export function unwrapPrivateKey(wrapped: string): string;
export function rotateMasterKey(
  oldWrapped: string,
  newMasterKey: Buffer,
): string;
```

### Algorithme

- Chiffrement `AES-256-GCM` via `node:crypto`.
- Enveloppe préfixée `v1:` pour permettre la rotation future de la clé maître.
- La clé maître est lue depuis `process.env.CHAT_ESCROW_KEY` (base64, 32 octets).
- Si `CHAT_ESCROW_KEY` est absente, le vault est inactif ; toute tentative d'appel lève une erreur claire.

### Test de garde

- `src/lib/__tests__/crypto-escrow-server-only.test.ts` : importer `crypto-escrow` depuis un contexte client doit faire échouer le build.

---

## Stockage des archives

### Où ?

**Cloudflare R2**, déjà utilisé pour les photos.

### Pourquoi R2 ?

- Déjà intégré dans la stack (`src/lib/r2.ts`).
- 10 Go de stockage gratuits par mois.
- S3-compatible.
- Pas de coût de sortie à petite échelle.
- Aucun matériel personnel requis.

### Quoi archiver ?

| Archive | Contenu | Forme |
|---|---|---|
| Archives de messages | Ciphertexts des messages supprimés ou des conversations rompues après la fenêtre de modération | JSON chiffré avec la clé maître |
| Archives de clés | Clés de conversation historiques + générations retirées de clés d'identité | JSON chiffré avec la clé maître |

### Pourquoi chiffrer les archives ?

Même si R2 fuit ou est compromis, les archives restent inutilisables sans `CHAT_ESCROW_KEY`. Cela protège la bonne foi de l'administrateur : le fournisseur cloud ne peut pas lire le contenu.

### Format suggéré

```json
{
  "version": "v1",
  "createdAt": "2026-08-28T12:00:00Z",
  "conversationId": "uuid",
  "encryptedPayload": "base64(ciphertext)",
  "iv": "base64",
  "tag": "base64",
  "schema": "conversation-archive-v1"
}
```

---

## Gestion de la clé maître

### Mode freetier : Vercel env

| Aspect | Mesure |
|---|---|
| Génération | 32 octets aléatoires via `crypto.randomBytes`, encodés base64, jamais dans le dépôt |
| Stockage | Variable d'environnement Vercel, Production / Preview / Development séparées |
| Sauvegarde | Copie chiffrée hors ligne (ex. disque dur externe ou coffre-fort numérique personnel) — **incontournable** |
| Rotation | Procédure documentée : ré-envelopper les clés utilisateurs une par une, conserver l'ancien format lisible pendant la transition |
| Accès | Limiter les collaborateurs Vercel à zéro ; activer l'A2F sur le compte Vercel |

### Limites

- Un accès au compte Vercel ou à la base donne un accès théorique au vault.
- C'est acceptable à 23 inscrits avec un seul admin, mais pas à grande échelle.

### Évolution recommandée

| Étape | Solution | Coût estimé |
|---|---|---|
| 0 (actuel) | Vercel env | Gratuit |
| 1 | AWS KMS free tier (20 000 requêtes/mois gratuites) | Gratuit jusqu'au seuil |
| 2 | KMS + HSM cloud ou matériel dédié | Payant |

---

## Exemple concret : détection d'une arnaque au wallet BTC

En mode E2E pur, l'envoi d'une clé de wallet Bitcoin dans un message privé est techniquement indétectable pour le service. Cela illustre bien la limite de la modération par métadonnées.

| Capacité | E2E pur | Vault activé + scan ciblé |
|---|---|---|
| Détection automatique | Impossible | Possible, mais **jamais massive** |
| Base légale | Métadonnées + signalements | RGPD, proportionnalité, transparence CGU |
| Faux positifs | N/A | Élevé : un wallet peut être partagé légitimement |
| Action | Prévention éducative (message d'avertissement) | Signalement + validation humaine |

**Position de Libre** : pas de scan automatique du contenu, même si le vault est activé. Seuls les signalements et les indicateurs de risque sur métadonnées déclenchent une investigation humaine. Le vault est un levier de dernier recours, pas une surveillance généralisée.

---

## Journalisation et audit

Tout événement lié au vault est journalisé via `src/lib/logger.ts` :

| Événement | Données journalisées (sans PII) |
|---|---|
| Activation du vault | timestamp, adminId, raison |
| Restitution de clé | userId (hashé), timestamp, succès/échec |
| Rotation de clé | userId (hashé), timestamp, génération |
| Export d'urgence | timestamp, adminId, scope (conversationId hashé), raison |
| Accès aux archives | timestamp, adminId, clé R2 consultée |

**Règle** : jamais de contenu de message, jamais de clé privée, jamais de clé maître dans les logs.

---

## Procédure d'activation du vault

1. **Décision** : l'administrateur documente la raison (modération impossible, obligation légale, etc.).
2. **Préparation** : générer ou vérifier `CHAT_ESCROW_KEY` ; sauvegarde hors ligne.
3. **Notification** : e-mail + bandeau aux utilisateurs actifs ; mise à jour des CGU.
4. **Déploiement** : activer `ENABLE_CHAT_ESCROW=1` sur Vercel.
5. **Vérification** : tests sur comptes de test ; confirmation que les anciennes conversations restent en E2E pur.
6. **Journalisation** : consigner l'activation dans les logs d'audit.

---

## Procédure d'export d'urgence

1. **Motif** : réquisition judiciaire, signalement grave, détournement avéré.
2. **Autorisation** : documenté par l'administrateur ; si possible, double validation.
3. **Exécution** : script admin (`scripts/emergency-export.ts`) qui :
   - identifie la conversation ou le compte cible,
   - restitue la clé privée depuis le coffre,
   - déchiffre les messages vault concernés,
   - produit un export structuré.
4. **Journalisation** : tout l'export est tracé.
5. **Durée** : l'export est conservé le temps strictement nécessaire, puis détruit.

---

## Risques et parades

| Risque | Parade |
|---|---|
| Perte de `CHAT_ESCROW_KEY` | Sauvegarde hors ligne obligatoire ; procédure de rotation |
| Accès non autorisé à Vercel | A2F, zero collaborator, compte dédié |
| Fuite R2 | Archives chiffrées ; clé maître jamais dans R2 |
| Vault activé silencieusement | `ENABLE_CHAT_ESCROW` visible, notification utilisateurs, logs |
| Lecture rétroactive | `encScheme` et date d'activation comme frontière ; pas de ré-chiffrement rétroactif |
| Migration ratée | Journalisation sans PII des échecs ; pas de régénération silencieuse |

---

## Recommandations immédiates

1. **Ne pas activer le vault maintenant.** Le garder comme capacité documentée.
2. **Préparer le code du vault** (`crypto-escrow.ts`, migrations, routes) mais le laisser inactif sans `CHAT_ESCROW_KEY`.
3. **Ne pas stocker `CHAT_ESCROW_KEY` en production** tant que le vault n'est pas nécessaire.
4. **Rédiger la procédure d'activation et d'export d'urgence** avant toute mise en service.
5. **Planifier l'évolution vers un KMS** dès que le volume ou l'exposition juridique le justifie.
