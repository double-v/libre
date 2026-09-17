# Recherche — Notifications et badges (phase 0)

Aucun `NEEDS CLARIFICATION` ne subsiste dans le contexte technique du plan ; cette phase consigne les décisions techniques et les alternatives écartées, pour que le plan et les tâches ne les rejouent pas.

---

## R1 — Le non-lu est dérivé, pas stocké

**Décision** : « non lu » = `Message` où `readAt IS NULL`, `deletedAt IS NULL`, `senderId ≠ moi`, dans une conversation dont je suis participant, expéditeur ni bloqué (dans un sens ou l'autre) ni banni. Aucune table `Notification`.

**Pourquoi** : la donnée existe déjà et la route `GET messages` la pose à la lecture ; un modèle `Notification` doublerait la vérité et exigerait une migration pour le lot 1. #195 posait la question ; la réponse est « tout dériver ».

**Alternatives écartées** : table `Notification` (double vérité, migration, purge à gérer) ; compteur dénormalisé sur `Conversation` (écriture supplémentaire à chaque message, risque de dérive).

---

## R2 — Un seul endpoint de non-lus, qui renvoie des identifiants de conversation

**Décision** : `GET /api/chat/unread` → `{ conversationIds: string[] }`. La tab bar affiche la pastille si la liste est non vide ; la liste Messages pose la pastille sur les conversations présentes dans la liste. Aucun compte n'est renvoyé (FR-006 : on ne fabrique pas un chiffre qu'on s'interdit d'afficher).

**Pourquoi** : une requête (`findMany` sur `Message` avec `distinct: ['conversationId']`) sert les deux surfaces ; le hook `useUnread` la partage via un contexte monté dans `(main)/layout.tsx`.

**Alternatives écartées** : étendre `/api/matches` avec `hasUnread` (mélange les responsabilités et force un rechargement complet des matchs pour rafraîchir une pastille) ; `{ count }` (chiffre, contraire à FR-006).

---

## R3 — Temps réel : un événement de plus, vers le destinataire

**Décision** : dans `POST /api/chat/[conversationId]/messages`, après le `trigger` existant sur `private-chat-{conv}`, déclencher `new-message` sur `getUserChannel(destinataire)` avec `{ conversationId }` seul. Le destinataire est l'autre participant (`conversation.userA/userB`, déjà chargé par `verifyParticipant`). Même bloc `try/catch` best-effort.

**Pourquoi** : le canal `private-user-{id}` existe déjà (matchs), est autorisé par `/api/pusher/auth`, et `useUnread` y est déjà abonné pour rien de plus. Payload minimal : pas de `senderId` (pas nécessaire, une donnée de moins qui circule).

**Alternatives écartées** : abonner `useUnread` à tous les `private-chat-*` de l'utilisateur (N abonnements, N auth) ; polling (latence, coût, contraire à SC-001).

---

## R4 — Un client Pusher partagé

**Décision** : `src/lib/pusher-client.ts` expose `getPusherClient()` (singleton `pusher-js`, `channelAuthorization` vers `/api/pusher/auth`) et `subscribeUserChannel(userId)` avec comptage de références. `useUnread` et `MatchDialog` l'utilisent ; les pages messages et chat gardent leur instance pour l'instant (refactor hors périmètre).

**Pourquoi** : Pusher facture par connexion ; quatre sockets par onglet, c'est trois de trop. Et un seul point de config.

---

## R5 — Resynchronisation : mount, `visibilitychange`, événement

**Décision** : `useUnread` charge `/api/chat/unread` au montage, sur `visibilitychange → visible`, et à chaque `new-message` reçu (refetch plutôt que mutation locale, pour rester fidèle à la base). Quand la page de conversation a marqué lu (son `GET messages`), elle émet un événement DOM `libre:unread-changed` que le hook écoute pour refetch immédiatement.

**Pourquoi** : FR-005 exige la resync à partir de la base ; l'événement DOM évite un couplage direct page ↔ hook (même motif que `open-feedback` et `instant-match` déjà en place dans le dépôt).

---

## R6 — Badge d'icône : API Badging, sans valeur

**Décision** : `src/lib/app-badge.ts` avec `setBadge()` → `navigator.setAppBadge()` **sans argument** et `clearBadge()` → `navigator.clearAppBadge()`, chacun feature-detecté et enveloppé dans `try/catch` (les promesses peuvent rejeter sur PWA non installée). Appelés depuis `useUnread` (liste vide → clear) et `logout.ts`.

**Pourquoi** : Q4 — sans nombre partout. `setAppBadge()` sans argument affiche un badge générique (point sur Android, rendu minimal sur iOS, accepté).

**Alternatives écartées** : `setAppBadge(conversationIds.length)` (chiffre) ; badge posé par le service worker à la réception du push (dépend du lot 2 et ne couvre pas le cas « app ouverte »).

---

## R7 — Files admin : un endpoint léger, et le layout admin en serveur

**Décision** : `GET /api/admin/queues` → `{ reports, verifications, feedback }` (trois `count` sur `status`), protégé par `requireAdmin()`. `SiteNav` l'appelle via `useAdminQueues` **seulement si** `isAdmin`, au montage, à chaque changement de `pathname` et sur `visibilitychange` (Q3 — pas de canal, pas de minuterie). `(admin)/layout.tsx` est un Server Component : il fait les trois `count` directement et rend `CountChip` à côté des trois entrées.

**Pourquoi** : `/api/admin/stats` compte aussi les utilisateurs et les bannis — inutile pour une pastille appelée à chaque navigation. Un endpoint dédié est plus honnête et facile à tester. Le layout admin ne repasse pas par HTTP pour ses propres données.

**Alternatives écartées** : réutiliser `stats` ; canal Pusher `private-admin` (Q3 : non) ; polling.

---

## R8 — Web Push standard, paquet `web-push`, VAPID

**Décision** : protocole Web Push (RFC 8030/8291/8292) via le paquet `web-push`. Variables : `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:`), et `NEXT_PUBLIC_VAPID_PUBLIC_KEY` pour `applicationServerKey` côté client. Génération : `npx web-push generate-vapid-keys` une fois, clés en secrets Vercel (prod + preview) et `.env` local ; `.env.example` documenté.

**Pourquoi** : aucun fournisseur supplémentaire (contrairement à Pusher Beams, OneSignal, FCM direct), gratuit, fonctionne sur Android et iOS installée, et le service worker existe déjà. Runtime Node des routes API : `web-push` n'est pas compatible edge — aucune route concernée ne déclare `runtime = 'edge'` aujourd'hui.

**Alternatives écartées** : Pusher Beams (vendeur, SDK natif orienté apps, coût) ; e-mail (décision #43, V2) ; FCM directement (ne couvre pas iOS web).

---

## R9 — Envoi après réponse, best-effort, nettoyage 410

**Décision** : `src/lib/push/server.ts` expose `sendPushToUser(userId, payload)` et `sendPushToAdmins(payload)`. Chaque route appelante fait `after(() => sendPush…)` (Next 16, `next/server`) pour ne pas retarder la réponse ; la fonction elle-même attrape tout, journalise `{ event: 'push.send.failed', status, conversationId? }` sans PII, et supprime l'abonnement sur `404`/`410`. Si `VAPID_PRIVATE_KEY` est absente, `sendPush…` est un no-op journalisé (comme le stub `trust/notify.ts`) — la fonctionnalité se dégrade sans casser.

**Pourquoi** : constitution — effets de bord post-persist jamais bloquants ; SC-008. `after()` est la primitive Next prévue pour ça sur Vercel.

---

## R10 — Règle « une notif par conversation jusqu'à lecture » (Q1)

**Décision** : avant d'envoyer le push d'un message, `hadUnreadBefore(conversationId, recipientId, newMessageId)` compte les messages non lus adressés au destinataire dans cette conversation **autres que** le nouveau ; si > 0, pas d'envoi. Fonction dans `chat-unread.ts`, testée avec un faux `db`.

**Pourquoi** : aucun état supplémentaire, la lecture (qui remet `readAt`) réarme naturellement. Le push Pusher `new-message` vers le destinataire, lui, part toujours (la pastille doit rester exacte).

---

## R11 — Silence au premier plan (Q2) et clic sur la notification

**Décision** : dans `sw.js`, le handler `push` fait `clients.matchAll({ type: 'window', includeUncontrolled: true })` ; si un client a `visibilityState === 'visible'` **et** `focused === true`, on ne montre rien. Sinon `showNotification(title, { body, icon: '/icon-192.png', badge: '/icon-96.png', tag, data: { url } })` avec `tag` = `conv-{id}` / `match` / `admin-reports` / `admin-feedback` pour remplacer plutôt qu'empiler. `notificationclick` : fermer, chercher une fenêtre existante → `focus()` puis `navigate(url)`, sinon `openWindow(url)`.

**Pourquoi** : Q2. Chrome n'impose pas la notification quand une fenêtre du site est visible : notre règle tombe dans l'exception documentée. `tag` évite trois bulles pour trois messages si la fenêtre de regroupement de R10 ne suffisait pas (ceinture et bretelles).

---

## R12 — Abonnement par appareil, réglage dans Paramètres

**Décision** : `PushSettings` (client) : état = `supported` (`'PushManager' in window && 'Notification' in window`), `iosNotInstalled` (UA iOS et pas `display-mode: standalone`), `permission` (`Notification.permission`), `subscribed` (`registration.pushManager.getSubscription()` non nul). Activer = `Notification.requestPermission()` sur le clic, puis `subscribe({ userVisibleOnly: true, applicationServerKey })`, puis `POST /api/push/subscriptions`. Désactiver = `DELETE` puis `subscription.unsubscribe()`. Le switch réutilise exactement le motif « Mode invisible » de la page.

**Pourquoi** : FR-014/015/024. L'état « abonné » est celui de **cet** appareil ; si le serveur ne connaît pas l'abonnement local (compte changé sur le même navigateur), on le re-POSTe silencieusement.

**Alternatives écartées** : réglage global sur `User` (ne reflète pas la réalité des permissions par appareil, et un autre compte sur le même navigateur casserait tout).

---

## R13 — Déconnexion et suppression de compte

**Décision** : `src/lib/logout.ts` : `logout()` = `clearBadge()` → (si abonnement local) `DELETE /api/push/subscriptions` + `unsubscribe()` → `signOut({ redirect: false })`. Les deux appels `signOut` de `settings/page.tsx` et les deux de `profile/page.tsx` passent par lui. Suppression de compte : `onDelete: Cascade` sur `push_subscriptions.user_id` — vérifié par un test de schéma (la migration porte la contrainte).

---

## R14 — Composants DS

**Décision** : proposer dans `DESIGN.md` (§ Tags & Badges, § Component Library) :
- `NotificationDot` — cercle 8 px `bg-coral`, `aria-label` obligatoire (« Nouveaux messages », « Éléments en attente »), positionné en absolu en haut à droite de l'icône parente, **aucune animation**. Variante `inline` pour la liste Messages.
- `CountChip` — chip pill `text-xs font-medium`, fond `bg-coral` texte blanc, min-width 20 px, réservé aux surfaces admin ; masqué à 0.

Aucune nouvelle couleur, aucun nouveau rayon : tokens existants (`coral`, `rounded-full`).

**Pourquoi** : constitution IV ; `Tag` existe mais est un chip de texte (`px-2 py-0.5`), pas un point — on ne le détourne pas.

---

## R15 — Sécurité des endpoints d'abonnement

**Décision** : `POST /api/push/subscriptions` valide avec zod (`endpoint` URL https, `keys.p256dh` et `keys.auth` base64url, `userAgent` ≤ 256 car.), rate-limité (helper existant, 10/min), upsert sur `endpoint` (unique) rattaché à la session ; un `endpoint` déjà rattaché à un autre compte est réassigné (même navigateur, autre compte). `DELETE` prend `{ endpoint }` et ne supprime que si `userId` = session.

**Pourquoi** : constitution III (whitelist, rate limit) ; un endpoint de push est une adresse d'envoi — on ne laisse personne en enregistrer pour quelqu'un d'autre.
