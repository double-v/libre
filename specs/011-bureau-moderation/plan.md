# Implementation Plan: Bureau de modération

**Branch**: `docs/011-bureau-moderation` | **Date**: 2026-10-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-bureau-moderation/spec.md`

## Summary

Six chantiers, une issue par story :

1. **Présence réelle** (#498) : `users.last_seen_at` au jour près, écrit par
   le proxy qui lit déjà le compte à chaque navigation (R1). Stats admin,
   tri et masquage à 90 jours de Découvrir passent dessus ; `lastActive`
   reste pour l'indicateur « en ligne » (R2).
2. **Page Indices** : grappes **dérivées** des liens déjà en base
   (`ProfileSignal.autreUserId`, `SignupTrace.ipHash`) par une fonction pure
   (R3), doublon probable = deux comptes sur un même appareil dont un seul a
   confirmé son adresse (R4). Elle **remplace** la file « Profils à
   vérifier » et reprend ses décisions.
3. **Gestes par lot** : les gestes unitaires sont extraits dans
   `src/lib/moderation/gestes.ts` ; le lot les rejoue compte par compte, avec
   un bilan et la garde « même grappe ou tous douteux » revérifiée côté
   serveur pour le retrait (R5).
4. **Navigation** : section « Modération » (Indices, Signalements,
   Vérifications, Retours), redirection de `/admin/profils`, filtres des
   listes dans l'adresse via `useFiltresUrl` (R6, R7).
5. **Inscription** : double saisie, `suggererDomaine` local, correction
   d'adresse prouvée par mot de passe ; **correctif** de `verify-email` qui
   accepte aujourd'hui un lien émis pour une autre adresse (R8).
6. **Cycle de vie** : deux règles dans `REGLES_RETENTION`
   (`comptesNonVerifies` 30 j, `comptesInactifs` 1 an avec préavis à J-335),
   exécutées par la purge paresseuse existante via `effacerCompte` (R9) ;
   répartition de présence dans les stats (cases < 5).

## Technical Context

**Language/Version**: TypeScript 5, Node 22 (runtime Node des routes et du proxy Next)
**Primary Dependencies**: Next.js 16 App Router, Prisma 7, NextAuth 4 (JWT) — **aucune nouvelle dépendance**
**Storage**: PostgreSQL (Neon) — 2 colonnes sur `users`, 1 index, 0 table (`data-model.md`)
**Testing**: Vitest (+ Testing Library), Playwright local (chromium en cache) pour les pixels
**Target Platform**: Vercel Hobby, PWA
**Project Type**: application web Next.js (front + routes API)
**Performance Goals**: au plus une écriture de présence par compte et par jour ; aucune navigation ralentie (écriture conditionnelle, best-effort) ; page Indices calculée en mémoire < 1 s pour ≈ 200 comptes
**Constraints**: aucune donnée de membre dans le contexte agent (seed factice, agrégats) ; `lastSeenAt` et `preavisInactiviteAt` privés ; pas de cron (purge par le trafic, plafond 50 comptes par passage) ; migration additive écrite à la main, jamais modifiée une fois poussée
**Scale/Scope**: ≈ 200 comptes, quelques dizaines de grappes, lots ≤ 50

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Verdict | Pourquoi |
|---|---|---|
| I. L'humain d'abord | ✅ | Masquer les absents de Découvrir sert la qualité des rencontres, pas l'engagement. Aucune relance d'engagement : le préavis d'inactivité n'est envoyé qu'une fois, pour prévenir une suppression. |
| II. Français, copie inclusive | ✅ sous vigilance | Raisons des grappes, règle des 30 jours, préavis : phrases complètes, sans soupçon côté membre. Copie relue avant livraison. |
| III. Vie privée invariant | ✅ sous conditions | Deux champs privés ajoutés à la garde de non-fuite ; aucune adresse e-mail dans une URL (R8) ; correction d'adresse sans oracle ; durées dans `regles.ts` donc dans la politique ; correctif d'un lien de vérification qui ne vérifiait pas l'adresse. |
| IV. Design System fait loi | ✅ sous condition | Page Indices composée de `Card`, `Tag`, `Button`, `Alert`, `CountChip` (admin) existants. **Manquent** une case à cocher et une boîte de confirmation : à proposer dans `DESIGN.md` avec le prototype, avant tout code (T0 de US3). |
| V. Le pixel est le seul juge | ✅ | Prototype de la page Indices validé avant US2/US3 ; captures Playwright de `/admin/indices`, `/register`, écran d'attente. |
| VI. Ticket = maille | ✅ | 6 issues ; lot possible en branche tampon (préférence opérateur). |

Re-vérifié après la Phase 1 : aucun écart. Le retrait par lot reste un geste
humain avec liste nominative confirmée (clarification 2, art. 22).

## Project Structure

### Documentation (this feature)

```text
specs/011-bureau-moderation/
├── spec.md
├── plan.md              # ce fichier
├── research.md          # R1–R11
├── data-model.md
├── quickstart.md
├── contracts/api.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                         # User.lastSeenAt, User.preavisInactiviteAt
└── migrations/<horodatage>_presence_cycle_de_vie/migration.sql

src/proxy.ts                              # US1 : écriture de la présence
src/lib/
├── presence.ts                           # US1 : jourDePresence, doitEcrire (pur)
├── fraude/grappes.ts                     # US2 : construireGrappes, raisons, doublonProbable (pur)
├── fraude/indices-admin.ts               # US2 : chargement base → grappes
├── moderation/gestes.ts                  # US3 : inviterVerification, deciderProfil, supprimerDoublon
├── email.ts                              # US5 : suggererDomaine
├── email-send.ts                         # US6 : sendPreavisInactiviteEmail
├── retention/regles.ts, purge.ts         # US6 : deux règles
├── admin-queues.ts                       # US4 : profils → indices
└── admin-analytics.ts                    # US1/US6 : présence
src/hooks/useFiltresUrl.ts                # US4
src/app/(admin)/layout.tsx                # US4 : section Modération
src/app/(admin)/admin/indices/page.tsx    # US2/US3
src/app/(admin)/admin/profils/page.tsx    # US4 : redirection
src/app/(admin)/admin/{users,reports,verifications,feedback}/page.tsx  # US4 : filtres dans l'adresse
src/components/admin/{GrappeCard,ComparaisonComptes,BarreLot}.tsx      # US2/US3
src/app/api/admin/indices/…               # US2
src/app/api/admin/moderation/lot/route.ts # US3
src/app/api/admin/stats/route.ts          # US1/US6
src/app/api/discover/route.ts             # US1 : tri + masquage 90 j
src/app/api/auth/corriger-adresse/route.ts# US5
src/app/api/auth/verify-email/route.ts    # US5 : correctif adresse du jeton
src/app/(auth)/register/page.tsx, login/page.tsx  # US5
src/app/(legal)/confidentialite/page.tsx  # US1/US6 (lit regles.ts)
src/__tests__/city-label-never-leaks.test.ts       # garde étendue
```

**Structure Decision** : application Next.js unique existante. Toute la
logique de décision (présence, grappes, doublon, garde du lot, suggestion de
domaine, échéances de purge) vit dans des fonctions **pures** testées en
TDD ; les routes ne font que charger, appeler et journaliser.

## Ordre et dépendances

```text
US1 présence ──▶ US6 cycle de vie (inactivité, masquage)
US2 Indices  ──▶ US3 lot (s'appuie sur les grappes)
US2 Indices  ──▶ US4 navigation (remplace la file)
US5 inscription : indépendante (le correctif verify-email peut partir seul)
```

Ordre conseillé : US1 → US2 (après prototype) → US3 → US4 → US5 → US6.
US5 peut être avancée : elle tarit les doublons pendant que le reste se
construit.

## Complexity Tracking

Aucune violation de la constitution à justifier.
