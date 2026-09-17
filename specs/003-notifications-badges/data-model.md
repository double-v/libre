# Modèle de données — Notifications et badges (phase 1)

## Lot 1 — rien de nouveau en base

### Message non lu (dérivé)

Un message est **non lu pour `me`** si :

```
message.readAt IS NULL
AND message.deletedAt IS NULL
AND message.senderId <> me
AND conversation ∋ me (userA = me OR userB = me)
AND NOT EXISTS block (blockerId, blockedId) ∈ {(me, sender), (sender, me)}
AND sender.isBanned = false
```

Requête de référence (`src/lib/chat-unread.ts`) :

```ts
db.message.findMany({
  where: {
    readAt: null,
    deletedAt: null,
    senderId: { not: me, notIn: blockedOrBlocking(me) },
    sender: { isBanned: false },
    conversation: { OR: [{ userA: me }, { userB: me }] },
  },
  distinct: ['conversationId'],
  select: { conversationId: true },
});
```

Index utilisés : `messages(conversationId, createdAt)` (existant). À ~20 comptes, aucun index supplémentaire ; si la table grossit, un index partiel `(readAt) WHERE readAt IS NULL` est le candidat naturel — hors périmètre.

**Transitions** : `readAt` passe de `NULL` à `now()` dans `GET /api/chat/[conversationId]/messages` (existant, inchangé). `deletedAt` (soft-delete existant) retire le message du non-lu.

### Règle « déjà non lu ? » (lot 2, mais même module)

`hadUnreadBefore(conversationId, recipientId, excludeMessageId)` = `count` des messages de la conversation, `senderId <> recipientId`, `readAt IS NULL`, `deletedAt IS NULL`, `id <> excludeMessageId`. `> 0` → pas de push.

### Files admin (existantes)

| File | Table | Filtre |
|---|---|---|
| Signalements | `reports` | `status = 'pending'` (index `status`) |
| Vérifications | `verification_requests` | `status = 'pending'` |
| Retours | `feedback` | `status = 'open'` (index `status`) |

Mêmes filtres que `/api/admin/stats` — la source de vérité reste ces trois `status`.

---

## Lot 2 — `PushSubscription`

### Prisma

```prisma
model PushSubscription {
  id         String   @id @default(uuid()) @db.Uuid
  userId     String   @db.Uuid
  endpoint   String   @unique
  p256dh     String
  auth       String
  userAgent  String?
  createdAt  DateTime @default(now())
  lastUsedAt DateTime?

  user User @relation("PushSubscriptions", fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("push_subscriptions")
}
```

Et sur `User` : `pushSubscriptions PushSubscription[] @relation("PushSubscriptions")`.

**Pas de `@map` sur les colonnes** : les colonnes gardent le nom camelCase des champs, comme `readAt`, `createdAt`, `reviewedBy` ailleurs dans le schéma (leçon `siteconfig-map-drift` : ne pas introduire de `@map` de colonne là où le reste du schéma n'en a pas).

### Migration (manuscrite, additive)

`prisma/migrations/2026MMDDHHMMSS_add_push_subscriptions/migration.sql` :

```sql
CREATE TABLE "push_subscriptions" (
  "id"         UUID NOT NULL,
  "userId"     UUID NOT NULL,
  "endpoint"   TEXT NOT NULL,
  "p256dh"     TEXT NOT NULL,
  "auth"       TEXT NOT NULL,
  "userAgent"  TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");
ALTER TABLE "push_subscriptions"
  ADD CONSTRAINT "push_subscriptions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

Table `users`, type `UUID` et colonnes camelCase confirmés contre `prisma/migrations` (ex. `profiles_userId_fkey`). Appliquée par la CI puis Vercel (`migrate deploy`) ; jamais `migrate dev`.

### Cycle de vie

| Événement | Effet |
|---|---|
| Activation du réglage sur un appareil | `upsert` sur `endpoint` (réassigné au compte courant si déjà connu) |
| Désactivation | `DELETE` par `endpoint`, si `userId` = session |
| Déconnexion sur l'appareil | idem (`logout.ts`) |
| Suppression du compte | cascade |
| Envoi → `404` ou `410` | suppression |
| Envoi réussi | `lastUsedAt = now()` (best-effort, pour un futur ménage) |

### Validation (zod, `POST`)

- `endpoint` : URL `https://`, ≤ 2048 car.
- `keys.p256dh` : base64url, 87–88 car. (clé P-256 non compressée)
- `keys.auth` : base64url, 22 car.
- `userAgent` : optionnel, tronqué à 256 car. côté serveur

### Ce qu'on ne stocke pas

Ni le contenu des notifications envoyées, ni un historique d'envoi, ni un compteur. La table ne sert qu'à savoir **où** envoyer.
