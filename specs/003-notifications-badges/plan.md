# Plan d'implémentation — Notifications et badges

**Spec** : [spec.md](./spec.md) · **Date** : 2026-09-16 · **Constitution** : v1.0.0 · **Branche de spec** : `docs/spec-notifications-badges`

**Input** : spec clarifiée le 2026-09-16 (4 questions) — voir `## Clarifications` de la spec.

---

## Résumé

Rendre visible ce qui existe déjà en base (les messages non lus, les files admin) et permettre — sur demande explicite — d'être prévenu hors de l'app, sans jamais afficher de chiffre côté membre ni notifier un like.

Deux lots, indépendants :

- **Lot 1 — sans migration** (stories 1, 2, 3) : un endpoint de non-lus dérivé de `Message.readAt`, un événement temps réel supplémentaire vers le destinataire, un hook `useUnread` qui pose la pastille sur la tab bar et le badge d'icône ; un endpoint de files admin qui alimente la pastille de `SiteNav` et les compteurs de la sidebar admin. Deux composants DS neufs (`NotificationDot`, `CountChip`) à proposer dans `DESIGN.md` avant le code.
- **Lot 2 — une migration additive** (stories 4, 5) : table `push_subscriptions`, Web Push standard (VAPID, paquet `web-push`), handlers `push` / `notificationclick` dans `public/sw.js`, réglage opt-in par appareil dans Paramètres, envois best-effort après persistance (message, match, signalement, retour), nettoyage des abonnements morts.

---

## Contexte technique

**Langage / framework** : TypeScript, Next.js 16 App Router (React 19), routes API en runtime Node (pas d'edge — `web-push` et `pusher` en dépendent).

**Dépendances principales** : `pusher` / `pusher-js` (existant), `web-push` (à ajouter, lot 2), Prisma 7 + `@prisma/adapter-pg` (existant).

**Stockage** : PostgreSQL/Neon. Lot 1 : aucune écriture nouvelle. Lot 2 : table `push_subscriptions` (migration additive écrite à la main, cf. `data-model.md`).

**Tests** : Vitest (routes avec `vi.mock('@/lib/db')`, hooks/composants Testing Library), Playwright pour le gate pixels (chromium en cache, cf. mémoire projet), test manuel sur Android + iOS installée pour le push (non automatisable).

**Plateformes cibles** : navigateur mobile et desktop ; PWA installée sur Android (Chrome/Firefox/Samsung) et iOS 16.4+ (push et badge uniquement installée).

**Objectifs de performance** : pastille visible < 5 s après réception (SC-001) — porté par Pusher, déjà en place ; `GET /api/chat/unread` en une requête SQL ; files admin en trois `count` indexés (`status`).

**Contraintes** : aucun chiffre côté membre (FR-006) ; push opt-in, jamais de prompt non sollicité (FR-015) ; contenu jamais dans la notif (FR-016) ; tous les effets de bord post-persist en `try/catch` (FR-025, constitution) ; zéro valeur inline, composants dans `src/components/ui/` (constitution IV) ; prototype validé + pixels réels (constitution V).

**Échelle** : ~20 comptes aujourd'hui ; rien ici n'a besoin d'être optimisé au-delà d'index déjà présents (`messages(conversationId, createdAt)`, `reports(status)`, `feedback(status)`).

---

## Contrôle de constitution

| Principe | Impact | Verdict |
|---|---|---|
| I — humain d'abord | Pastille sans chiffre, pas de like, push opt-in, une seule notif par conversation jusqu'à lecture, silence si l'app est au premier plan. Aucun ressort d'engagement. | ✅ |
| II — français, copie non excluante | Copie neuve : libellés de pastille, réglage « Me prévenir hors de l'app », astuce iOS, textes de notifs génériques, paragraphe Confidentialité. Tutoiement. | ✅ à surveiller en revue de copie |
| III — vie privée | Notif = métadonnées seules (jamais contenu ni nom). Nouvelle donnée conservée : l'adresse de push d'un appareil, décrite dans Confidentialité (FR-027) et effacée avec le compte (cascade), à la déconnexion, au 410. Endpoints d'abonnement authentifiés + rate-limités. Événement Pusher vers le destinataire : `conversationId` seul. | ✅ |
| IV — Design System | Deux composants neufs, `NotificationDot` et `CountChip` → proposés dans `DESIGN.md` **avant** le code (tâche dédiée, lot 1). Le switch de Paramètres réutilise le motif du « Mode invisible ». | ⚠️ tâche DESIGN.md en tête de lot 1 |
| V — le pixel juge | Surfaces touchées : tab bar (pastille), liste Messages (pastille par conversation), `SiteNav` (pastille admin), sidebar admin (chips), Paramètres (switch + astuce iOS). Prototype validé puis vérification sur l'app servie pour chaque PR front. | ⚠️ gate visuel par story |
| VI — ticket / checkpoint | Cinq user stories → cinq issues, cinq PR, lot 1 livrable sans lot 2. #158 recadrée et fermée par la dernière PR du lot 2 (ou refermée comme épic). | ✅ |
| Contraintes techniques | Migration additive manuscrite ; `migrate dev` proscrit ; push/pusher en best-effort post-persist ; runtime Node. | ✅ |

**Gates** : aucune violation à justifier. Section « Complexity Tracking » vide.

---

## Vue technique d'ensemble

```
                       ┌──────────── Lot 1 ────────────┐
[POST message] ──persist──► Pusher private-chat-{conv}  'new-message'  (existant)
                     └──► Pusher private-user-{dest}   'new-message' {conversationId}   (neuf)
                                                             │
[App connectée] ◄── useUnread ◄── GET /api/chat/unread ◄─────┘  (resync au mount / focus / event)
      ├─ tab bar Messages : <NotificationDot/>
      ├─ liste Messages   : <NotificationDot/> par conversation
      └─ PWA installée    : navigator.setAppBadge() / clearAppBadge()

[SiteNav, isAdmin] ── GET /api/admin/queues ──► <NotificationDot/> sur l'icône admin
[admin/layout]     ── comptes serveur ──────► <CountChip/> Signalements / Vérifications / Retours

                       ┌──────────── Lot 2 ────────────┐
[Paramètres] ─ toggle ─► pushManager.subscribe(VAPID) ─► POST /api/push/subscriptions
                                                          DELETE /api/push/subscriptions (désactivation, logout)
[POST message|like|report|feedback] ──persist──► after(() => sendPush…)   best-effort
                                                      │  web-push → endpoint de l'appareil
                                                      │  410/404 → suppression de l'abonnement
[sw.js] 'push' ─► fenêtre Libre au premier plan ? oui → rien ; non → showNotification(texte générique, data.url)
        'notificationclick' ─► focus fenêtre existante + navigate(url) | openWindow(url)
```

---

## Structure du projet

### Documentation (cette feature)

```text
specs/003-notifications-badges/
├── plan.md              # ce fichier
├── research.md          # phase 0 — décisions et alternatives
├── data-model.md        # phase 1 — non-lu dérivé, push_subscriptions, migration
├── quickstart.md        # phase 1 — scénarios de validation de bout en bout
├── contracts/
│   ├── api.md           # /api/chat/unread, /api/admin/queues, /api/push/subscriptions
│   └── events.md        # événements Pusher, charge utile des push, contrat du service worker
└── tasks.md             # phase 2 — /speckit-tasks
```

### Code source (racine du dépôt)

```text
prisma/
├── schema.prisma                                  # + model PushSubscription (lot 2)
└── migrations/2026XXXX_add_push_subscriptions/    # additive, manuscrite (lot 2)

public/sw.js                                       # + handlers push / notificationclick, CACHE_NAME v3 (lot 2)

src/app/api/
├── chat/unread/route.ts                           # GET — conversations avec non-lu (lot 1)
├── chat/[conversationId]/messages/route.ts        # + trigger private-user-{dest} ; + push (lots 1, 2)
├── likes/route.ts                                 # + push new-match (lot 2)
├── moderation/report/route.ts                     # + push admins (lot 2)
├── feedback/route.ts                              # + push admins (lot 2)
├── admin/queues/route.ts                          # GET — 3 compteurs (lot 1)
├── push/subscriptions/route.ts                    # POST / DELETE (lot 2)
└── users/me/route.ts                              # (cascade : rien à faire, vérifier en test)

src/lib/
├── chat-unread.ts                                 # requête de non-lus + règle « déjà non lu ? » (lots 1, 2)
├── pusher-client.ts                               # singleton pusher-js côté client (lot 1)
├── app-badge.ts                                   # setAppBadge / clearAppBadge feature-detect (lot 1)
├── logout.ts                                      # signOut + désabonnement + clearAppBadge (lots 1, 2)
└── push/
    ├── server.ts                                  # sendPushToUser / sendPushToAdmins, nettoyage 410 (lot 2)
    ├── client.ts                                  # subscribe / unsubscribe / état de l'appareil (lot 2)
    └── platform.ts                                # détection iOS non installée, support (lot 2)

src/hooks/
├── useUnread.ts                                   # état non-lu partagé + resync focus (lot 1)
└── useAdminQueues.ts                              # compteurs admin pour SiteNav (lot 1)

src/components/ui/
├── NotificationDot.tsx                            # pastille sans chiffre (lot 1)
└── CountChip.tsx                                  # chip chiffrée admin (lot 1)

src/components/
├── PushSettings.tsx                               # section Paramètres (lot 2)
└── (edits) ui/SiteNav.tsx, MatchDialog.tsx

src/app/(main)/layout.tsx                          # tab bar + pastille, monte useUnread (lot 1)
src/app/(main)/messages/page.tsx                   # pastille par conversation (lot 1)
src/app/(main)/settings/page.tsx                   # + <PushSettings/> (lot 2)
src/app/(admin)/layout.tsx                         # + CountChip sur 3 entrées (lot 1)
src/app/(legal)/confidentialite/page.tsx           # + paragraphe notifications (lot 2)

DESIGN.md                                          # + NotificationDot, CountChip (lot 1, avant code)
.env.example                                       # + VAPID_* (lot 2)
```

**Décision de structure** : application web unique (App Router). Les helpers métier vont dans `src/lib/` (convention du dépôt), les hooks dans `src/hooks/`, les composants DS dans `src/components/ui/`. Pas de nouveau dossier de premier niveau.

---

## Découpage en issues (une par user story)

| Lot | Story | Issue | Contenu | Migration | Gate visuel |
|---|---|---|---|---|---|
| 1 | US1 | #389 | DESIGN.md (NotificationDot, CountChip), `chat-unread.ts`, `GET /api/chat/unread`, trigger `private-user`, `pusher-client.ts`, `useUnread`, tab bar, liste Messages, tests | non | oui |
| 1 | US2 | #390 | `app-badge.ts`, branchement dans `useUnread`, `logout.ts` (clear), tests | non | manuel Android/iOS |
| 1 | US3 | #391 | `GET /api/admin/queues`, `useAdminQueues`, `SiteNav`, `(admin)/layout.tsx` avec `CountChip`, tests | non | oui |
| 2 | US4 | #392 | migration `push_subscriptions`, `web-push`, VAPID env, `push/server.ts`, `push/client.ts`, `push/platform.ts`, `sw.js`, `PushSettings`, envois message + match, règle « déjà non lu », `logout.ts` (unsubscribe), Confidentialité, tests | **oui** | oui (Paramètres) + manuel |
| 2 | US5 | #393 | envois dans `moderation/report` et `feedback`, `sendPushToAdmins`, tests | non | non |

Dépendances : US2 et US3 dépendent de US1 (composants DS, `pusher-client`) ; US5 dépend de US4. US1 → US2 → US3 peuvent être trois PR successives du lot 1 ; US4 puis US5 ferment le lot 2 et #158.

---

## Risques et points de vigilance

- **Trois instances `pusher-js`** existent déjà (MatchDialog, messages, chat). `useUnread` en ajouterait une quatrième : on introduit `pusher-client.ts` (singleton) et on y branche `useUnread` + `MatchDialog` ; les deux pages peuvent migrer plus tard (hors périmètre, à noter en REX).
- **Chrome et le push « silencieux »** : si le SW ne montre rien après un `push`, Chrome peut afficher une notification générique — sauf quand une fenêtre du site est visible. La règle Q2 (silence si une fenêtre est au premier plan) tombe exactement dans l'exception ; à vérifier sur appareil (quickstart).
- **iOS** : `pushManager` n'existe que dans l'app installée. Détecter `display-mode: standalone` + UA iOS pour afficher l'astuce (FR-024) au lieu d'un bouton mort.
- **Permission refusée** : `Notification.permission === 'denied'` est définitif côté web ; le réglage l'explique et ne redemande pas.
- **Neon partagée** : la migration du lot 2 est additive (nouvelle table, cascade), appliquée par la CI puis Vercel ; jamais `migrate dev`.
- **Vercel / `after()`** : les envois de push se font dans `after()` (Next 16) pour ne pas allonger la réponse ; toujours dans un `try/catch` interne, journalisé sans PII (`userId` hashé ou absent, `conversationId` OK).
- **Blocages / bans** dans le non-lu (FR-003) : ni `/api/matches` ni la route messages ne filtrent aujourd'hui ; `chat-unread.ts` le fait explicitement (table `blocks` dans les deux sens + `isBanned` de l'expéditeur) et le test le couvre.

---

## Contrôle de constitution — après conception

Re-évalué après `research.md`, `data-model.md` et `contracts/` : verdicts inchangés. Les deux ⚠️ (IV et V) sont des gates de process portés par des tâches explicites, pas des violations. Aucune entrée dans Complexity Tracking.
