# Tâches — Notifications et badges

**Spec** : [spec.md](./spec.md) · **Plan** : [plan.md](./plan.md) · **Contrats** : [api.md](./contracts/api.md), [events.md](./contracts/events.md) · **Validation** : [quickstart.md](./quickstart.md)

Cinq user stories, une issue chacune, deux lots. La maille d'**issue** est la story, jamais la tâche : une issue = une PR = un checkpoint opérateur (principe VI). Lot 1 (US1 → US2 → US3) ne touche pas la base ; lot 2 (US4 → US5) porte la seule migration.

Tests d'abord (gates de la constitution). `[P]` = parallélisable (fichiers disjoints, aucune dépendance sur une tâche non terminée). Toute tâche qui touche `*.tsx` / `*.css` passe le gate visuel du principe V : prototype validé par l'opérateur, puis pixels sur l'app servie avant merge.

**Hors périmètre** : likes reçus (charte), match « nouveau » (#161/#195), son, e-mail/SMS (#43), croisements.

---

## Phase 1 — Mise en place (lot 1, avant tout code de story)

- [x] T001 Proposer dans `DESIGN.md` (§ Tags & Badges et § Component Library) les deux composants neufs : `NotificationDot` (cercle 8 px `bg-coral`, `aria-label` obligatoire, absolu haut-droite de l'icône parente ou `inline`, **aucune animation**) et `CountChip` (pill `text-xs font-medium` `bg-coral` texte blanc, min-width 20 px, réservé aux surfaces admin, masqué à 0). Aucune nouvelle couleur ni rayon — tokens existants seulement. À faire valider par l'opérateur avant T007
- [x] T002 [P] Écrire les tests dans `src/lib/__tests__/pusher-client.test.ts` : `getPusherClient()` renvoie la même instance à deux appels, `subscribeUserChannel(userId)` compte les références et ne désabonne qu'au dernier `unsubscribe`, absence de `NEXT_PUBLIC_PUSHER_KEY` → `null` sans lever
- [x] T003 Implémenter `src/lib/pusher-client.ts` (singleton `pusher-js`, `channelAuthorization` vers `/api/pusher/auth`, comptage de références par canal) — Pusher facture par connexion et l'app en ouvre déjà trois par onglet (R4)
- [x] T004 [P] Écrire les tests dans `src/lib/__tests__/app-badge.test.ts` : `setBadge()` appelle `navigator.setAppBadge()` **sans argument**, `clearBadge()` appelle `clearAppBadge()`, absence de l'API → no-op sans erreur, promesse rejetée → avalée
- [x] T005 Implémenter `src/lib/app-badge.ts` (feature-detect + `try/catch`, cf. R6)
- [x] T006 [P] Écrire les tests dans `src/lib/__tests__/logout.test.ts` : `logout()` appelle `clearBadge()` puis `signOut({ redirect: false })` ; un échec du badge n'empêche pas `signOut`
- [x] T007 Implémenter `src/lib/logout.ts` (première version : badge + `signOut` ; le désabonnement push arrive en T047) et y faire passer les quatre appels existants de `src/app/(main)/settings/page.tsx` (deux) et `src/app/(main)/profile/page.tsx` (deux)

---

## Phase 2 — Socle (bloquant pour US1, US2, US3)

- [x] T008 [P] Écrire les tests de `src/lib/__tests__/chat-unread.test.ts` avec un faux `db` : `unreadConversationIds(me)` — liste vide ; un non-lu ; deux non-lus dans la même conversation → un seul id ; message envoyé par `me` → absent ; `deletedAt` posé → absent ; expéditeur bloqué par `me` → absent ; `me` bloqué par l'expéditeur → absent ; expéditeur `isBanned` → absent
- [x] T009 Implémenter `unreadConversationIds(me)` dans `src/lib/chat-unread.ts` selon la requête de référence de `data-model.md` (`distinct: ['conversationId']`, `blocks` dans les deux sens, `sender.isBanned = false`)
- [x] T010 [P] Écrire les tests dans `src/components/ui/__tests__/NotificationDot.test.tsx` : rend un `<span role="status">` avec l'`aria-label` passé, refuse de rendre sans `aria-label` (TypeScript + test), variante `inline` sans positionnement absolu, aucune classe `animate-*`
- [x] T011 [P] Écrire les tests dans `src/components/ui/__tests__/CountChip.test.tsx` : rend le nombre, rend `null` pour `0`, `aria-label` « N en attente »
- [x] T012 [P] Implémenter `src/components/ui/NotificationDot.tsx` conformément à T001 (tokens seulement, `prefers-reduced-motion` sans objet car aucune animation)
- [x] T013 [P] Implémenter `src/components/ui/CountChip.tsx` conformément à T001
- [x] T014 Prototype HTML des deux composants sur la tab bar, la liste Messages, `SiteNav` et la sidebar admin (thèmes `libre` et `retro`, clair et sombre, 400 px et 1080 px) via le skill `proto-server` ou un artifact — validation opérateur avant toute intégration (principe V)

**Checkpoint** : socle prêt — les stories du lot 1 peuvent démarrer.

---

## Phase 3 — US1 · Voir qu'on m'a écrit, d'où que je sois dans l'app (P1) 🎯 MVP

**Test d'indépendance** : deux comptes, deux navigateurs ; A sur Découvrir reçoit un message de B → pastille sur l'onglet Messages sans rechargement ; ouvrir la conversation la fait disparaître. Quickstart § US1.

- [x] T015 [P] [US1] Écrire les tests de la route dans `src/app/api/chat/unread/__tests__/route.test.ts` : `401` sans session ; `200` `{ conversationIds }` ; jamais de champ `count` ; délègue à `unreadConversationIds`
- [x] T016 [US1] Implémenter `GET` dans `src/app/api/chat/unread/route.ts` (contrat `api.md`)
- [x] T017 [P] [US1] Étendre les tests de `src/app/api/chat/[conversationId]/messages/__tests__/route.test.ts` : le POST déclenche **aussi** `new-message` sur `private-user-{destinataire}` avec `{ conversationId }` seul (ni `senderId` ni contenu) ; une panne de ce second `trigger` laisse la réponse à `201`
- [x] T018 [US1] Ajouter le second `trigger` dans `src/app/api/chat/[conversationId]/messages/route.ts` (destinataire = autre participant, même bloc `try/catch` best-effort, `getUserChannel`)
- [x] T019 [P] [US1] Écrire les tests de `src/hooks/__tests__/useUnread.test.tsx` : fetch au montage ; refetch sur `new-message` du canal utilisateur ; refetch sur `visibilitychange → visible` ; refetch sur l'événement DOM `libre:unread-changed` ; `hasUnread` et `isUnread(conversationId)` ; désabonnement au démontage
- [x] T020 [US1] Implémenter `src/hooks/useUnread.ts` + `UnreadProvider` (contexte monté une fois dans le layout, abonné via `subscribeUserChannel`, R5)
- [x] T021 [US1] Monter `UnreadProvider` dans `src/app/(main)/layout.tsx` et poser `<NotificationDot aria-label="Nouveaux messages" />` sur l'onglet Messages de la tab bar quand `hasUnread`
- [x] T022 [US1] Poser `<NotificationDot inline />` sur chaque conversation de `src/app/(main)/messages/page.tsx` pour laquelle `isUnread(conversationId)`
- [x] T023 [US1] Émettre `window.dispatchEvent(new Event('libre:unread-changed'))` dans `src/app/(main)/chat/[conversationId]/page.tsx` après le `GET messages` initial (qui marque lu), et mettre à jour son test
- [x] T024 [US1] Test de garde `src/components/__tests__/no-unread-count.test.tsx` : aucun fichier de `src/app/(main)` ni `src/components` ne rend `conversationIds.length` ou un libellé « non lu(s) » suivi d'un nombre — FR-006 adossé à un test (constitution III, corollaire #328)
- [x] T025 [US1] Gate visuel sur l'app servie : captures Playwright tab bar et liste avec/sans pastille, clair/sombre, `libre`/`retro`, échantillonnage de plusieurs points de la pastille (jamais son seul centre) ; joindre les captures à la PR
- [x] T026 [US1] Ouvrir la PR en brouillon dès le premier push, corps avec `Closes #389`, passer en `ready` seulement après les quatre gates locaux

---

## Phase 4 — US2 · Un badge sur l'icône de l'app installée (P2)

**Test d'indépendance** : PWA installée sur Android ou iOS ; message reçu → badge sans nombre sur l'icône ; lecture → badge retiré ; déconnexion → badge retiré. Quickstart § US2.

- [x] T027 [P] [US2] Étendre `src/hooks/__tests__/useUnread.test.tsx` : liste non vide → `setBadge()` ; liste vide → `clearBadge()` ; pas d'appel en double quand l'état ne change pas
- [x] T028 [US2] Brancher `setBadge` / `clearBadge` dans `src/hooks/useUnread.ts` (effet sur `conversationIds.length > 0`)
- [x] T029 [US2] Vérifier que `logout()` (T007) est bien appelé avant toute redirection dans `settings/page.tsx` et `profile/page.tsx` ; test de non-régression dans `src/app/(main)/settings/__tests__/page.test.tsx` (ou équivalent existant)
- [x] T030 [US2] Validation manuelle Android (Chrome) + iOS installée (16.4+) selon quickstart § US2 ; consigner les captures d'icône dans la PR ; noter dans la PR que le rendu iOS sans nombre est « minimal, accepté » (Q4)
- [x] T031 [US2] PR brouillon → `ready` avec `Closes #390`

---

## Phase 5 — US3 · L'admin voit ses files se remplir sans aller les chercher (P2)

**Test d'indépendance** : compte admin ; un membre signale un profil ; au prochain changement de page, pastille sur l'icône admin de `SiteNav` ; `/admin` affiche « 1 » à côté de Signalements ; traiter → tout disparaît. Quickstart § US3.

- [x] T032 [P] [US3] Écrire les tests de `src/app/api/admin/queues/__tests__/route.test.ts` : non-admin → `404` sans appel de comptage ; admin → `{ reports, verifications, feedback }` avec les trois filtres de `data-model.md`
- [x] T033 [US3] Implémenter `GET` dans `src/app/api/admin/queues/route.ts` (`requireAdmin()`, trois `count`)
- [x] T034 [P] [US3] Écrire les tests de `src/hooks/__tests__/useAdminQueues.test.tsx` : aucun fetch si `enabled=false` ; fetch au montage, à chaque changement de `pathname`, sur `visibilitychange → visible` ; `hasPending`
- [x] T035 [US3] Implémenter `src/hooks/useAdminQueues.ts` (R7 — pas de canal, pas de minuterie)
- [x] T036 [US3] Dans `src/components/ui/SiteNav.tsx`, appeler `useAdminQueues({ enabled: isAdmin })` et poser `<NotificationDot aria-label="Éléments en attente" />` sur le lien Administration ; étendre `src/components/ui/__tests__/SiteNav.test.tsx` : pastille présente/absente, **aucun fetch** pour un non-admin (FR-013)
- [x] T037 [US3] Dans `src/app/(admin)/layout.tsx`, faire les trois `count` côté serveur et rendre `<CountChip>` à côté de Signalements, Vérifications, Retours ; test dans `src/app/(admin)/__tests__/layout.test.tsx` (chips à 0 non rendus)
- [x] T038 [US3] Gate visuel : `SiteNav` avec pastille à 400 px et 1080 px, sidebar admin avec chips, clair/sombre ; captures dans la PR
- [x] T039 [US3] PR brouillon → `ready` avec `Closes #391`

**Checkpoint lot 1** : livrable et utile sans le lot 2.

---

## Phase 6 — US4 · Être prévenu hors de l'app, parce que je l'ai demandé (P3)

**Test d'indépendance** : activer l'option sur un appareil, fermer l'app, recevoir un message depuis un autre compte → notification « Nouveau message » sans contenu, qui ouvre la conversation ; désactiver → plus rien. Quickstart § US4.

### Mise en place du lot 2

- [x] T040 Ajouter `web-push` à `package.json` en déclarant une version **déjà résolvable** par le lock actuel sans le régénérer localement (mémoire `getlibre-npm-lock-plus-recent`) ; vérifier `npm ci` en CI sur la PR brouillon
- [ ] T041 [P] *(reste : poser les secrets Vercel — refusé au classifier de l'agent, geste opérateur)* Générer les clés VAPID (`npx web-push generate-vapid-keys`), les déclarer dans `.env.example` (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:…`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`) avec un commentaire « absente = push désactivé, l'app fonctionne » ; poser les valeurs en secrets Vercel Production et Preview **séparés** (mémoire `vercel-cli-pieges` : passer par l'API pour preview)
- [x] T042 Ajouter `model PushSubscription` et la relation `pushSubscriptions` sur `User` dans `prisma/schema.prisma` (sans `@map` de colonne, cf. `data-model.md`)
- [x] T043 Écrire **à la main** `prisma/migrations/<timestamp>_add_push_subscriptions/migration.sql` (SQL de `data-model.md` : table, index unique `endpoint`, index `userId`, FK `ON DELETE CASCADE` vers `"users"`). **Jamais `prisma migrate dev`** — la base de développement est partagée ; la CI puis Vercel appliquent
- [x] T044 [P] Test de schéma `prisma/__tests__/push-subscriptions-migration.test.ts` (ou dans `src/lib/__tests__/`) : la migration contient bien `ON DELETE CASCADE` et l'index unique sur `endpoint` — la suppression de compte (FR-022) repose dessus

### Serveur

- [x] T045 [P] [US4] Écrire les tests de `src/lib/push/__tests__/server.test.ts` avec `web-push` et `db` mockés : `sendPushToUser` envoie à chaque abonnement de l'utilisateur ; `410`/`404` → suppression de l'abonnement ; autre erreur → journalisée sans PII, pas de throw ; `VAPID_PRIVATE_KEY` absente → no-op journalisé ; chaque charge utile (`message`, `match`, `admin-report`, `admin-feedback`) sérialisée ne contient ni `content`, ni `displayName`, ni `reason`, ni nom (SC-006) ; `lastUsedAt` mis à jour après succès
- [x] T046 [US4] Implémenter `src/lib/push/server.ts` (`import 'server-only'`, `sendPushToUser`, `sendPushToAdmins`, `buildPayload(kind, …)`, TTL par `kind`, cf. `events.md` et R9)
- [x] T047 [P] [US4] Étendre `src/lib/__tests__/chat-unread.test.ts` : `hadUnreadBefore(conversationId, recipientId, excludeId)` — `0` autre non-lu → `false` ; un autre non-lu → `true` ; le message exclu ne compte pas ; un message supprimé ne compte pas
- [x] T048 [US4] Implémenter `hadUnreadBefore` dans `src/lib/chat-unread.ts` (R10)
- [x] T049 [P] [US4] Écrire les tests de `src/app/api/push/subscriptions/__tests__/route.test.ts` : `POST` `201` ; même endpoint même compte → `200` sans doublon ; endpoint connu sous un autre compte → réassigné ; corps invalide (`endpoint` non https, `p256dh` malformé) → `400` ; `429` sous rate limit ; `DELETE` `204` ; endpoint d'un autre compte → `204` et ligne intacte ; `401` sans session
- [x] T050 [US4] Implémenter `POST` et `DELETE` dans `src/app/api/push/subscriptions/route.ts` (zod, rate limit 10/min, `upsert` sur `endpoint`, R15)
- [x] T051 [P] [US4] Étendre les tests de `src/app/api/chat/[conversationId]/messages/__tests__/route.test.ts` : après persistance, `after()` planifie `sendPushToUser(destinataire, payload message)` **seulement si** `hadUnreadBefore` est `false` ; une exception de `sendPushToUser` laisse la réponse à `201`
- [x] T052 [US4] Brancher `after(() => sendPushToUser(...))` dans `src/app/api/chat/[conversationId]/messages/route.ts` derrière `hadUnreadBefore`
- [x] T053 [P] [US4] Étendre les tests de `src/app/api/likes/__tests__/route.test.ts` (créer le fichier s'il n'existe pas) : sur match, `sendPushToUser` planifié pour les deux comptes avec la charge utile `match` ; panne → `201`
- [x] T054 [US4] Brancher `after(() => sendPushToUser(...))` ×2 dans la branche match de `src/app/api/likes/route.ts`

### Service worker et client

- [x] T055 [P] [US4] Écrire les tests de `public/__tests__/sw-push.test.ts` (charger `sw.js` dans un faux `self` Vitest) : `push` avec un client `visible && focused` → aucun `showNotification` ; sans client visible → `showNotification(title, { body, tag, data.url, icon, badge })` ; charge illisible → rien ; `notificationclick` → `focus()` + `navigate(url)` sur une fenêtre existante, sinon `openWindow(url)`
- [x] T056 [US4] Ajouter les handlers `push` et `notificationclick` dans `public/sw.js` et passer `CACHE_NAME` à `libre-v3` (contrat `events.md`, R11)
- [x] T057 [P] [US4] Écrire les tests de `src/lib/push/__tests__/platform.test.ts` : `getPushSupport()` → `supported=false` sans `PushManager` ; `iosNotInstalled=true` sur UA iOS hors `display-mode: standalone` ; `permission` reflète `Notification.permission`
- [x] T058 [P] [US4] Écrire les tests de `src/lib/push/__tests__/client.test.ts` : `enablePush()` appelle `requestPermission` puis `subscribe({ userVisibleOnly: true, applicationServerKey })` puis `POST` ; refus → état `denied` sans `subscribe` ; `disablePush()` → `DELETE` puis `unsubscribe()` ; tolère l'absence d'abonnement
- [x] T059 [US4] Implémenter `src/lib/push/platform.ts` et `src/lib/push/client.ts` (contrat `events.md`)
- [x] T060 [US4] Étendre `src/lib/logout.ts` et son test (T006) : désabonnement local + `DELETE` **avant** `signOut`, tolérant à l'échec
- [x] T061 [P] [US4] Écrire les tests de `src/components/__tests__/PushSettings.test.tsx` : quatre états rendus avec la copie de `events.md` (non supporté, iOS non installée, refusé, actif) ; switch `role="switch"` désactivé par défaut ; aucun `requestPermission` au montage (FR-015) ; clic → `enablePush` ; clic actif → `disablePush`
- [x] T062 [US4] Implémenter `src/components/PushSettings.tsx` en réutilisant le motif de switch du « Mode invisible » (`settings/page.tsx`) et l'insérer dans `src/app/(main)/settings/page.tsx` sous une section « Me prévenir hors de l'app »
- [x] T063 [US4] Ajouter le paragraphe notifications à `src/app/(legal)/confidentialite/page.tsx` (ce qui est conservé : adresse d'envoi de l'appareil et ses clés ; ce qui ne l'est jamais : contenu, historique ; suppression au désabonnement, à la déconnexion, avec le compte) et l'adosser à un test de copie ↔ code dans `src/app/(legal)/__tests__/confidentialite-push.test.tsx` (FR-027, corollaire #328)
- [x] T064 [US4] Gate visuel : section Paramètres dans ses quatre états, clair/sombre, 400 px ; captures dans la PR
- [ ] T065 [US4] *(opérateur, sur appareil)* Validation manuelle quickstart § US4 (Android, iOS installée, rafale, premier plan, désactivation, refus, déconnexion, abonnement mort, clé absente) ; consigner les résultats dans la PR
- [x] T066 [US4] PR brouillon → `ready` avec `Closes #392` ; mentionner la migration dans le corps

---

## Phase 7 — US5 · L'admin prévenu d'un signalement même l'app fermée (P3)

**Test d'indépendance** : admin abonné, app fermée ; un membre signale → « Nouveau signalement » ouvre `/admin/reports` ; un membre abonné non admin ne reçoit rien. Quickstart § US5.

- [x] T067 [P] [US5] Étendre `src/lib/push/__tests__/server.test.ts` : `sendPushToAdmins` cible uniquement les abonnements des comptes `role = 'ADMIN'` ; aucun admin abonné → no-op
- [x] T068 [P] [US5] Écrire/étendre les tests de `src/app/api/moderation/report/__tests__/route.test.ts` : après persistance, `after()` planifie `sendPushToAdmins(payload admin-report)` sans `reason` ni identités ; panne → statut inchangé
- [x] T069 [P] [US5] Écrire/étendre les tests de `src/app/api/feedback/__tests__/route.test.ts` : idem avec `admin-feedback`, sans `message` ni `url`
- [x] T070 [US5] Brancher `after(() => sendPushToAdmins(...))` dans `src/app/api/moderation/report/route.ts` et `src/app/api/feedback/route.ts`
- [ ] T071 [US5] *(opérateur, sur appareil)* Validation manuelle quickstart § US5 ; captures dans la PR
- [x] T072 [US5] PR brouillon → `ready` avec `Closes #393` **et** `Closes #158` (recadrage acté : son et toast nominatif abandonnés, cf. spec § Assumptions)

---

## Phase 8 — Finition et transversal

- [x] T073 [P] `docs(rex)` : consigner dans `CLAUDE.md` (§ Sécurité ou § Temps réel) les invariants nouveaux — charge utile de notification sans contenu ni nom, push opt-in par appareil, effets `after()` best-effort — et dans `DESIGN.md` l'usage de `NotificationDot` / `CountChip`
- [ ] T074 [P] Mémoire projet : noter la règle « une notif par conversation jusqu'à lecture » et le comportement Chrome « pas de notif imposée si une fenêtre est visible », vérifiés sur appareil (T065)
- [x] T075 Vérifier `.specify/feature.json` et fermer/relabelliser #158, #195 (commenter : non-lu dérivé, pas de modèle `Notification` ; reste ouvert pour le seul point « match nouveau ») et #161
- [x] T076 Nettoyer les worktrees (`git worktree remove`) et vérifier `git status` : aucun fichier d'état opérateur (`.ghwork/`, `.claude/ghwork-state.md`) balayé dans un commit

---

## Dépendances

```
Phase 1 (T001–T007) ─► Phase 2 (T008–T014) ─► US1 (T015–T026) ─► US2 (T027–T031)
                                                      └────────────► US3 (T032–T039)
US4 (T040–T066) — indépendante du lot 1 côté code, mais on la livre après (issue, migration, SW)
US4 ─► US5 (T067–T072) ─► Phase 8
```

- T001 (DESIGN.md) précède T012/T013 (composants) qui précèdent T021/T022/T036/T037.
- T014 (prototype) précède toute intégration `.tsx` du lot 1 (principe V).
- T009 (`unreadConversationIds`) précède T016 ; T048 (`hadUnreadBefore`) précède T052.
- T043 (migration) doit être **mergée et appliquée** avant que T050 tourne en preview/prod.
- T046 (`push/server.ts`) précède T052, T054, T070.
- T056 (`sw.js`) précède T065 (validation manuelle).

## Parallélisme

- Phase 1 : T002, T004, T006 (tests) en parallèle ; puis T003, T005, T007.
- Phase 2 : T008, T010, T011 en parallèle ; T012 ∥ T013 après T001.
- US1 : T015 ∥ T017 ∥ T019 (tests), puis T016 → T018 → T020 → T021/T022/T023.
- US4 : T041 ∥ T044 ; T045 ∥ T047 ∥ T049 ∥ T055 ∥ T057 ∥ T058 ∥ T061 (tests) ; T051 ∥ T053 après T046.
- US5 : T067 ∥ T068 ∥ T069.

## Stratégie de livraison

1. **MVP = US1** : une pastille sur Messages qui apparaît en temps réel et disparaît à la lecture. Sans migration, démontrable en cinq minutes, et c'est le manque le plus fréquent.
2. US2 et US3 suivent dans le même lot, chacune sa PR.
3. US4 est la seule PR à migration : la mettre en brouillon tôt pour que la CI applique la migration en dev, valider sur Android et iOS avant `ready`.
4. US5 ferme le lot 2 et #158.
