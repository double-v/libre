# Plan d'implémentation — Chantier 01 Sécurité

> **Pour agentic workers** : REQUIRED SUB-SKILL: superpowers:executing-plans.
> Tâches en checkbox (`- [ ]`) pour tracking.

**Goal** : Permettre à un·e utilisateur·rice de déclarer 3-5 contacts
de confiance (Cercle), de lancer un check-in de sécurité avant un
RDV, et d'avoir un niveau de confiance progressif visible.

**Architecture** : 4 phases incrémentales. Chaque phase produit du
code testable et déployable indépendamment. Pas de feature flag :
chaque phase est mergée et active en prod avant la suivante.

**Tech stack** : Next.js 16, Prisma 7, NextAuth 4, Resend (email),
Twilio optionnel (SMS), Vercel Cron.

---

## Phase 1 — Modèle de données + API Cercle (fondation)

> Aucune UX visible. Juste la DB et les endpoints. Sert de base
> à toutes les autres phases.

### Tâche 1.1 — Schema Prisma : TrustLevel, TrustContact, SafetyCheckin, CheckinAlert

- [ ] Ajouter les 4 modèles au schema (cf. spec.md)
- [ ] Ajouter les relations sur `User` :
  - `trustLevel TrustLevel?`
  - `trustContactsOwned TrustContact[] @relation("TrustContactOwner")`
  - `trustContactsOf TrustContact[] @relation("TrustContactTarget")`
  - `safetyCheckins SafetyCheckin[]`
- [ ] Migration : `npx prisma migrate dev --name add-trust-circle`
- [ ] Générer le client : `npx prisma generate`
- [ ] Vérifier que `prisma migrate deploy` passe en CI
- [ ] **Estim** : 1h
- [ ] **Ticket** : `[chantier-01] db Ajouter schema TrustCircle (4 tables)`

### Tâche 1.2 — Validators Zod pour TrustContact

- [ ] Créer `src/lib/trust/validators.ts`
- [ ] Schéma `addContactSchema` : `{ contactId?, contactEmail?, contactPhone?, channel }` (XOR : un seul des 3)
- [ ] Schéma `removeContactSchema` : `{ contactId }`
- [ ] Schéma `listContactsSchema` : aucun body
- [ ] Tests unitaires Vitest (cf. pattern existant)
- [ ] **Estim** : 0.5h
- [ ] **Ticket** : `[chantier-01] api Validators Zod pour TrustContact`

### Tâche 1.3 — API GET /api/circle/contacts

- [ ] Route handler dans `src/app/api/circle/contacts/route.ts`
- [ ] Auth check via `getServerSession`
- [ ] Retourne les 5 max contacts du user connecté
- [ ] Ne retourne **que** les contacts owner (pas ceux qui m'ont
  désigné, c'est leur décision de me le dire)
- [ ] Tests : user authentifié, user non auth (401)
- [ ] **Estim** : 1h
- [ ] **Ticket** : `[chantier-01] api GET /api/circle/contacts (lister mes contacts)`

### Tâche 1.4 — API POST /api/circle/contacts

- [ ] Même fichier, méthode POST
- [ ] Validate via `addContactSchema`
- [ ] Vérifier limite de 5 contacts (409 si dépassé)
- [ ] Si `contactId` fourni : vérifier que le user existe et n'est
  pas banni
- [ ] Si `contactEmail` fourni : format email, lowercase, pas
  d'auto-désignation (mon propre email)
- [ ] Retourne le contact créé
- [ ] Tests : 4 cas nominaux + 3 cas d'erreur (limite, auto-désig, format)
- [ ] **Estim** : 1.5h
- [ ] **Ticket** : `[chantier-01] api POST /api/circle/contacts (ajouter un contact)`

### Tâche 1.5 — API DELETE /api/circle/contacts/:id

- [ ] Vérifier que le contact appartient bien au user connecté
- [ ] Soft-delete possible ? **Non**, on hard-delete (RGPD, droit
  à l'oubli). Le contact **n'est pas notifié** de la suppression
  (c'est le user qui décide de qui est dans son cercle).
- [ ] Tests : owner only, contact inexistant (404)
- [ ] **Estim** : 0.5h
- [ ] **Ticket** : `[chantier-01] api DELETE /api/circle/contacts/:id`

### Tâche 1.6 — Cron de nettoyage des contacts « hors-app » jamais confirmés

- [ ] Si on autorise les contacts hors-app (email/tel), on a un
  problème : comment savoir si l'email est valide ? On **ne fait
  pas** de validation à l'ajout (l'UX serait trop friction). Mais
  on **ne notifie pas** un email tant qu'il n'a pas été confirmé.
- [ ] Champ à ajouter : `unverifiedEmailSentAt DateTime?` sur
  TrustContact + endpoint `/api/circle/contacts/:id/confirm`
  accessible via lien magique
- [ ] **OU** : on **ne supporte pas les contacts hors-app en V1**.
  On reporte à V2. Cf. décision ci-dessous.

> **DÉCISION À PRENDRE par l'utilisateur** : V1 = Libre-only
> (les contacts doivent avoir un compte Libre) ou V1 = libre
> + email ?
>
> Mon avis : **Libre-only en V1**. Raison : un contact hors-app
> non-notifié n'apporte aucune sécurité (s'il ne sait pas qu'il
> est dans mon cercle, comment il réagit en cas d'alerte ?).
> Et notifier un email/tel sans confirmation opt-in est un
> problème RGPD. On le fait bien en V2, avec un parcours
> d'invitation explicite.

- [ ] **Si décision = Libre-only** : supprimer les champs
  `contactEmail`, `contactPhone`, `channel` du schema, simplifier
  la tâche 1.2 en conséquence.
- [ ] **Estim** : 0h (déjà fait si on a tranché avant)
- [ ] **Ticket** : décision-architecture-V1 (à trancher avant
  de merger la 1.1)

### ✅ Fin de Phase 1

**Critère de merge** :
- 4 tables existent
- 3 endpoints API fonctionnent (GET, POST, DELETE)
- Tests Vitest passent
- Aucune UI encore (volontaire)

---

## Phase 2 — Check-in de sécurité + cron d'expiration

> Le check-in est le **cœur** de la feature sécurité. C'est ce qui
> transforme un « réseau de contacts » (statique) en un « système
> d'alerte actif » (dynamique).

### Tâche 2.1 — Validators Zod pour SafetyCheckin

- [ ] `src/lib/trust/checkin-validators.ts`
- [ ] Schéma `startCheckinSchema` : `{ durationMinutes: 30|60|120|240|480 }` (énum, pas libre, pour UX)
- [ ] Schéma `validateCheckinSchema` : `{ checkinId }` (token de session)
- [ ] Schéma `cancelCheckinSchema` : `{ checkinId }`
- [ ] **Estim** : 0.5h
- [ ] **Ticket** : `[chantier-01] api Validators Zod pour SafetyCheckin`

### Tâche 2.2 — API POST /api/circle/check-in (démarrer)

- [ ] Vérifier que le user a **au moins 1 contact** (sinon 422 avec
  message « Ajoute d'abord un contact à ton Cercle »)
- [ ] Vérifier qu'il n'y a pas déjà un check-in `active` pour ce
  user (un seul à la fois)
- [ ] Optionnel : récupérer la dernière position connue du user
  (`users.lastKnownLat/Lng`, à ajouter au schema)
- [ ] Créer le `SafetyCheckin` avec `expiresAt = now + duration`
- [ ] Retourne le checkin (id, expiresAt)
- [ ] **Estim** : 1.5h
- [ ] **Ticket** : `[chantier-01] api POST /api/circle/check-in (démarrer)`

### Tâche 2.3 — API POST /api/circle/check-in/:id/validate

- [ ] Vérifier que le checkin appartient au user
- [ ] Vérifier que status = `active`
- [ ] Update status = `validated`, `resolvedAt = now`
- [ ] Pas d'envoi de notification (c'est un happy path silencieux)
- [ ] **Estim** : 0.5h
- [ ] **Ticket** : `[chantier-01] api POST /api/circle/check-in/:id/validate`

### Tâche 2.4 — API POST /api/circle/check-in/:id/cancel

- [ ] Vérifier ownership
- [ ] Update status = `cancelled`
- [ ] **Estim** : 0.5h
- [ ] **Ticket** : `[chantier-01] api POST /api/circle/check-in/:id/cancel`

### Tâche 2.5 — API GET /api/circle/check-in/active

- [ ] Retourne le checkin actif du user (s'il y en a un)
- [ ] Utilisé par l'UI pour afficher le compte à rebours
- [ ] **Estim** : 0.5h
- [ ] **Ticket** : `[chantier-01] api GET /api/circle/check-in/active`

### Tâche 2.6 — Cron Vercel : scanExpiredCheckins

- [ ] Nouvelle route : `src/app/api/cron/circle/expire/route.ts`
- [ ] Header check `x-vercel-cron-secret` (cf. cron existant
  pour La Place, voir `src/app/api/admin/square/themes/schedule/route.ts`
  pour le pattern)
- [ ] Logique : tous les `SafetyCheckin` avec `status = 'active'`
  AND `expiresAt < now` → update status = `'expired'`
- [ ] Pour chaque expiré : créer N `CheckinAlert` (1 par contact)
  avec `deliveryStatus = 'queued'`
- [ ] Configurer dans `vercel.json` : `crons: [{ path: '/api/cron/circle/expire', schedule: '*/5 * * * *' }]`
- [ ] **Estim** : 2h
- [ ] **Ticket** : `[chantier-01] cron Vercel scanExpiredCheckins (toutes les 5 min)`

### Tâche 2.7 — Service de notification (stub V1)

- [ ] En V1, on ne fait **que logger** l'alerte (voir
  `src/lib/square/...` pour le pattern de logging)
- [ ] Interface `notifyContact(contact, checkin)` à implémenter
  en V2 (Resend email, Twilio SMS)
- [ ] **Estim** : 0.5h
- [ ] **Ticket** : `[chantier-01] service Interface notifyContact (stub V1)`

### ✅ Fin de Phase 2

**Critère de merge** :
- Un user peut démarrer / valider / annuler un check-in
- Le cron expire les checkins toutes les 5 min
- Les alertes sont créées (delivery = 'queued')
- Pas encore de notification réelle (c'est V2)

---

## Phase 3 — Trust Level + UI

> Le système de niveau de confiance, sa progression, son affichage.

### Tâche 3.1 — Calculateur TrustLevel

- [ ] `src/lib/trust/compute-level.ts`
- [ ] Fonction `computeTrustLevel(userId)` : retourne
  `{ score, band, factors }`
- [ ] Facteurs (+points) :
  - Email vérifié : +10
  - Selfie vérifié : +20
  - Ancienneté >= 30j : +10
  - Ancienneté >= 90j : +10
  - Ancienneté >= 365j : +10
  - Au moins 1 message dans La Place : +5
  - Au moins 1 match validé : +5
  - Au moins 3 matchs validés : +5
  - A déclaré un Cercle de confiance : +10
- [ ] Facteurs (-points) :
  - Signalement reçu (non-rejeté par modération) : -15
  - Banni dans le passé : -30
- [ ] **Bands** (par score) :
  - 0-19 : `newcomer`
  - 20-49 : `member`
  - 50-79 : `trusted`
  - 80+ : `anchor`
- [ ] Cache : invalider sur événements (vérif, signalement, etc.)
- [ ] Tests unitaires sur tous les seuils
- [ ] **Estim** : 3h
- [ ] **Ticket** : `[chantier-01] lib computeTrustLevel (calculateur + cache)`

### Tâche 3.2 — API GET /api/trust/level

- [ ] Retourne `{ band, score, factors: { label, delta, achieved }[] }`
- [ ] Auth required
- [ ] **Estim** : 0.5h
- [ ] **Ticket** : `[chantier-01] api GET /api/trust/level`

### Tâche 3.3 — Composant TrustBadge (avatar overlay)

- [ ] `src/components/TrustBadge.tsx`
- [ ] Props : `band: 'newcomer' | 'member' | 'trusted' | 'anchor'`
- [ ] Affichage : halo coral de plus en plus prononcé
  - newcomer : pas de halo
  - member : halo 1px
  - trusted : halo 2px + petite icône
  - anchor : halo 3px + icône + tooltip
- [ ] Respecter `prefers-reduced-motion` (pas d'animation
  pulsée sur anchor)
- [ ] Respecter `DESIGN.md` (couleurs tokens, pas de gris neutre)
- [ ] **Estim** : 1.5h
- [ ] **Ticket** : `[chantier-01] ui TrustBadge (composant halo)`

### Tâche 3.4 — Page /settings/trust

- [ ] Layout : header + 2 onglets (Mon Cercle / Mon niveau)
- [ ] Onglet « Mon Cercle » : EmptyStateCards si pas de contact
  + liste + bouton + Ajouter
- [ ] Onglet « Mon niveau » : jauge de progression + TrustBadge
  + détail des facteurs (sans score brut)
- [ ] CTA contextuel : « Pour passer au niveau supérieur,
  complète ta vérif. » avec lien vers la vérif
- [ ] **Estim** : 4h
- [ ] **Ticket** : `[chantier-01] ui Page /settings/trust (Cercle + Niveau)`

### Tâche 3.5 — Composant CheckinButton (intégré au chat 1:1)

- [ ] Apparaît dans la conversation, sous la liste des messages
- [ ] 2 états : inactif (bouton « Activer un check-in ») /
  actif (compte à rebours + bouton « Je suis safe »)
- [ ] Modal de configuration de la durée au premier clic
  (30 min / 1h / 2h / 4h / 8h)
- [ ] **Estim** : 3h
- [ ] **Ticket** : `[chantier-01] ui CheckinButton (intégré chat 1:1)`

### Tâche 3.6 — Intégrer TrustBadge sur Discover + Matches + Profile

- [ ] Ajouter `<TrustBadge band={...} />` sur chaque carte
  profile (cf. `Card` refactor fait dans le commit `2bbb492`)
- [ ] **Estim** : 1h
- [ ] **Ticket** : `[chantier-01] ui TrustBadge sur Discover/Matches/Profile`

### ✅ Fin de Phase 3

**Critère de merge** :
- Le user peut gérer son cercle dans `/settings/trust`
- Le user peut lancer un check-in depuis le chat
- Le niveau de confiance est visible sur les profils
- Le cron tourne en prod (sans notifier pour l'instant)

---

## Phase 4 — Polish, a11y, tests E2E

> On s'assure que la feature est livrable.

### Tâche 4.1 — Page admin : alertes de sécurité

- [ ] `/admin/circle/alerts` : liste des `CheckinAlert` avec
  statut de livraison
- [ ] Permet de marquer comme « traité manuellement » (le modo
  a appelé le user, l'alerte est close)
- [ ] **Estim** : 2h
- [ ] **Ticket** : `[chantier-01] admin Page alertes de sécurité`

### Tâche 4.2 — Page "Comment ça marche" du Cercle

- [ ] `/settings/trust/how-it-works` (ou modal depuis la page)
- [ ] Explique en français :
  - Ce qu'est un Cercle (et ce que ce n'est pas : un tracker
    de position)
  - Comment les alertes marchent (email, jamais sans opt-in)
  - Limites : le Cercle n'est pas un service d'urgence, c'est
    un réseau social de confiance
- [ ] **Estim** : 1.5h
- [ ] **Ticket** : `[chantier-01] doc Page "Comment ça marche" du Cercle`

### Tâche 4.3 — Audit a11y de la feature

- [ ] Vérifier navigation clavier sur tout le flow (Cercle +
  Check-in + Trust level)
- [ ] Vérifier les ARIA labels (surtout pour le compte à rebours)
- [ ] Vérifier le focus management sur la modal de durée
- [ ] Tester avec VoiceOver / NVDA
- [ ] **Estim** : 2h
- [ ] **Ticket** : `[chantier-01] a11y Audit complet du Chantier 01`

### Tâche 4.4 — Tests E2E Playwright

- [ ] Scénario 1 : user ajoute 2 contacts, les voit dans la
  liste, en supprime 1
- [ ] Scénario 2 : user démarre un check-in de 30 min, le
  voit dans l'UI, le valide manuellement
- [ ] Scénario 3 : check-in expire (manipulation du temps ou
  trigger manuel), alerte créée en DB
- [ ] Scénario 4 : Trust level monte après vérif + ancienneté
- [ ] **Estim** : 4h (le plus long, c'est le scénario 3)
- [ ] **Ticket** : `[chantier-01] e2e Tests Playwright du Chantier 01`

### Tâche 4.5 — Documentation publique

- [ ] Section dédiée dans `/faq` (page existante)
  - « C'est quoi le Cercle de Confiance ? »
  - « Mes contacts savent-ils qu'ils sont dans mon cercle ? »
  - « Que se passe-t-il si j'active un check-in et que je ne
    reviens pas ? »
- [ ] **Estim** : 1h
- [ ] **Ticket** : `[chantier-01] doc FAQ publique pour le Cercle`

### ✅ Fin de Phase 4

**Critère de merge** :
- Tous les tests passent (unit + e2e)
- a11y validé
- FAQ publique à jour
- Page admin fonctionnelle

---

## Récap d'effort

| Phase | Tâches | Estim totale | Statut |
|---|---|---|---|
| Phase 1 — DB + API Cercle | 5 + 1 décision | 4.5h | ⬜ |
| Phase 2 — Check-in + cron | 7 | 6h | ⬜ |
| Phase 3 — Trust Level + UI | 6 | 13.5h | ⬜ |
| Phase 4 — Polish + a11y + e2e | 5 | 10.5h | ⬜ |
| **TOTAL** | **23 + 1** | **~34h** | ⬜ |

À raison de 2-3h/jour de développement solo, c'est **2-3 semaines**
de chantier. Faisable. Rythme soutenable.

## Tickets GitHub

Chaque tâche ci-dessus a un ticket correspondant (cf. section
« Ticket » de chaque tâche). Filtrer par `chantier:01-securite` +
`ready` pour voir le pipe immédiat.
