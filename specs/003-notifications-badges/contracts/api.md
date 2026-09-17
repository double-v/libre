# Contrats API — Notifications et badges

Toutes les routes : session NextAuth requise (`401` sinon), JSON, erreurs au format `{ error: string }` comme le reste de l'API. Runtime Node.

---

## `GET /api/chat/unread` (lot 1, US1)

Conversations de l'utilisateur courant contenant au moins un message non lu (définition : `data-model.md`).

**Réponse `200`**

```json
{ "conversationIds": ["uuid", "uuid"] }
```

- Jamais de compte. Liste vide = `[]`.
- Conversations avec une personne bloquée/bloquante ou bannie : absentes.
- Messages supprimés : ignorés.

**Erreurs** : `401`. Pas de `4xx` métier.

**Tests** : liste vide ; un non-lu ; deux non-lus dans la même conversation → un seul id ; message de moi → absent ; message supprimé → absent ; expéditeur bloqué (dans chaque sens) → absent ; expéditeur banni → absent.

---

## `GET /api/admin/queues` (lot 1, US3)

Compteurs des files de travail admin.

**Auth** : `requireAdmin()` → `404` pour un non-admin (même comportement que le layout admin : on ne révèle pas l'existence de la route).

**Réponse `200`**

```json
{ "reports": 2, "verifications": 0, "feedback": 5 }
```

**Tests** : non-admin → `404`, sans appel DB de comptage ; admin → trois compteurs, `0` possible.

---

## `POST /api/push/subscriptions` (lot 2, US4)

Enregistre (ou réattribue) l'abonnement de l'appareil courant.

**Rate limit** : 10 / min / utilisateur (helper existant).

**Corps**

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/…",
  "keys": { "p256dh": "…", "auth": "…" },
  "userAgent": "…"
}
```

**Réponse `201`** : `{ "id": "uuid" }` (idempotent : un `endpoint` déjà connu pour ce compte renvoie `200` avec le même `id`).

**Erreurs** : `400` validation (`details` zod, comme les autres routes) ; `401` ; `429`.

**Tests** : création ; ré-enregistrement du même endpoint → `200`, pas de doublon ; endpoint connu sous un autre compte → réassigné ; corps invalide → `400` ; rate limit → `429`.

---

## `DELETE /api/push/subscriptions` (lot 2, US4)

**Corps** : `{ "endpoint": "https://…" }`

**Réponse** : `204`. Idempotent (`204` même si rien à supprimer).

**Règle** : ne supprime que si `userId` = session ; un endpoint appartenant à un autre compte → `204` sans effet (pas de fuite).

**Tests** : suppression ; endpoint inconnu → `204` ; endpoint d'un autre compte → `204` et ligne intacte.

---

## Routes existantes modifiées

| Route | Ajout | Lot |
|---|---|---|
| `POST /api/chat/[conversationId]/messages` | trigger `new-message` sur `private-user-{destinataire}` `{ conversationId }` ; `after(sendPushToUser(destinataire, message))` si `!hadUnreadBefore(...)` | 1, 2 |
| `POST /api/likes` (branche match) | `after(sendPushToUser(liked, match))` et `after(sendPushToUser(liker, match))` | 2 |
| `POST /api/moderation/report` | `after(sendPushToAdmins(report))` | 2 |
| `POST /api/feedback` | `after(sendPushToAdmins(feedback))` | 2 |

Aucune de ces routes ne change son statut de réponse ni son corps. Tests de non-régression : une panne simulée de `pusher.trigger` ou de `web-push` laisse la réponse à `201` (SC-008).
