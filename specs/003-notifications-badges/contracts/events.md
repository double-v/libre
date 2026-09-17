# Contrats temps réel, push et service worker

## Événements Pusher

| Canal | Événement | Charge utile | Émis par | Écouté par |
|---|---|---|---|---|
| `private-chat-{conv}` | `new-message` | `{ id, senderId, createdAt }` | messages POST | page chat (existant) |
| `private-chat-{conv}` | `message-deleted` | `{ id }` | messages DELETE | page chat (existant) |
| `private-user-{id}` | `new-match` | `{ matchId, conversationId, matchedWith }` | likes POST | MatchDialog, page messages (existant) |
| `private-user-{id}` | `new-message` | `{ conversationId }` | messages POST | `useUnread` (**neuf**) |

Autorisation : `/api/pusher/auth` autorise déjà `private-user-{id}` pour `id` = session — rien à changer.

Événement DOM interne (même onglet) : `libre:unread-changed` — émis par la page chat après son `GET messages` (marquage lu) ; `useUnread` refetch. Sans charge utile.

---

## Charge utile Web Push (chiffrée par `web-push`, lue par `sw.js`)

```json
{ "kind": "message", "title": "Nouveau message", "body": "Quelqu'un t'a écrit.", "url": "/chat/<conversationId>", "tag": "conv-<conversationId>" }
{ "kind": "match",   "title": "Nouveau match",   "body": "Vous vous êtes plu.",  "url": "/messages",             "tag": "match" }
{ "kind": "admin-report",   "title": "Nouveau signalement", "body": "Un signalement attend.", "url": "/admin/reports",  "tag": "admin-reports" }
{ "kind": "admin-feedback", "title": "Nouveau retour",      "body": "Un retour attend.",      "url": "/admin/feedback", "tag": "admin-feedback" }
```

Invariants (FR-016, FR-018, SC-006) : jamais de contenu de message, de `displayName`, de motif de signalement, de nom de signalé/signalant. Le test de `push/server.ts` sérialise chaque charge utile et vérifie l'absence de ces champs. La copie finale des `title`/`body` est validée en revue (FR-026).

Options `web-push` : `TTL` 24 h pour message/match, 7 jours pour admin ; `urgency: 'normal'`.

---

## Contrat du service worker (`public/sw.js`, lot 2)

- `CACHE_NAME` passe à `libre-v3` (déploiement d'un nouveau SW).
- `push` :
  1. `event.data.json()` → charge utile ci-dessus ; charge illisible → ne rien montrer.
  2. `clients.matchAll({ type: 'window', includeUncontrolled: true })` ; si un client `visibilityState === 'visible' && focused` → **ne rien montrer** (Q2).
  3. Sinon `registration.showNotification(title, { body, icon: '/icon-192.png', badge: '/icon-96.png', tag, renotify: false, data: { url } })`.
- `notificationclick` : `notification.close()` ; parmi les clients fenêtre, en prendre un, `focus()` puis `navigate(url)` ; sinon `clients.openWindow(url)`.
- Aucun `setAppBadge` dans le SW : le badge d'icône est piloté par `useUnread` (R6). Si l'app est fermée, le badge posé avant fermeture reste, ce qui est exact tant que rien n'a été lu.

---

## Contrat client (`src/lib/push/client.ts`, `platform.ts`)

- `getPushSupport()` → `{ supported, iosNotInstalled, permission: 'default' | 'granted' | 'denied' }`.
- `getDeviceSubscription()` → `PushSubscription | null` (via `navigator.serviceWorker.ready`).
- `enablePush()` : `requestPermission()` (doit être appelé dans un gestionnaire de clic) → `subscribe({ userVisibleOnly: true, applicationServerKey })` → `POST`. Renvoie l'état final.
- `disablePush()` : `DELETE` → `unsubscribe()`. Tolère l'absence d'abonnement.

Copie d'interface (FR-024, FR-026) :

| État | Texte |
|---|---|
| non supporté | « Ton navigateur ne permet pas les notifications. » |
| iOS non installée | « Sur iPhone, ajoute d'abord Libre à ton écran d'accueil (Partager → Sur l'écran d'accueil), puis reviens ici. » |
| refusé | « Les notifications sont bloquées dans les réglages de ton appareil pour Libre. » |
| actif | « Tu seras prévenu·e ici en cas de nouveau message ou de nouveau match. » |
