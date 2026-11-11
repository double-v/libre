# Implementation Plan: Refonte du bureau de modération et vérification par code manuscrit

**Branch**: `docs/012-bureau-refonte` | **Date**: 2026-11-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-bureau-refonte/spec.md`

## Summary

On remplace le geste du selfie par un code de quatre chiffres écrit à la main. Le code est tiré et révoqué par le serveur, lu par OCR à titre d'indice, et le membre peut toujours réessayer (24 h d'attente seulement après trois refus). Le back-office est reconstruit sur le prototype validé : quatre entrées (Activité, Membres, Retours, Outils), Membres en hub de modération avec des cas dérivés, une fiche à gestes guidés, des gestes optimistes envoyés par lots idempotents, deux sanctions graduées (avertir, masquer), et un tableau d'activité narratif fait d'agrégats existants mis en cache. Aucune nouvelle collecte, aucune bibliothèque de graphiques, une invocation pour N gestes.

## Technical Context

**Language/Version**: TypeScript 5, Node 22 (Vercel)
**Primary Dependencies**: Next.js 16 App Router (React 19), Prisma 7, NextAuth 4, tesseract.js (déjà embarqué), web-push, Tailwind v4
**Storage**: PostgreSQL (Neon) — 3 tables et 7 colonnes ajoutées, migrations additives à la main
**Testing**: Vitest (unitaire et routes), Playwright (E2E, captures)
**Target Platform**: navigateur mobile d'abord (360 px), puis tablette et bureau ; Vercel Hobby
**Project Type**: application web Next.js monolithique
**Performance Goals**: écran utilisable < 2 s en 4G (SC-007) ; ≤ 3 écritures serveur pour 10 gestes (SC-008) ; activité servie depuis le cache dans 10 minutes
**Constraints**: offre Hobby (invocations, durée, pas de cron fiable) ; aucune donnée de membre dans le contexte d'un agent ; tokens de la charte uniquement
**Scale/Scope**: environ 200 comptes aujourd'hui, 1 à 2 modérateurs ; ~10 écrans admin, 1 écran membre modifié

## Constitution Check

| Principe | Verdict | Comment |
|---|---|---|
| I. L'humain d'abord | ✅ | Le tableau raconte des personnes ; aucune mécanique d'engagement côté membre ; aucune impasse sauf bannissement |
| II. Français, copie inclusive | ✅ | Consignes du selfie sans hypothèse corporelle (« pose-la à côté de toi », « quelqu'un peut l'écrire ») ; phrases complètes |
| III. Vie privée | ✅ | Nouveaux champs privés ajoutés à la garde de non-fuite ; push sans motif ; OCR local ; agrégats seulement ; aucune nouvelle collecte de présence |
| IV. Design System | ⚠️ à faire | 11 composants à proposer dans `DESIGN.md` **avant** le code (R12), une tâche par story concernée |
| V. Pixel | ✅ | Prototype validé le 2026-11-11 (`proto-bureau.html`) ; gate de captures dans `quickstart.md` |
| VI. Ticket = maille | ✅ | Une issue par user story (8) ; PR en brouillon ; l'opérateur merge |

Aucune violation à justifier. Re-vérifié après la phase 1 : inchangé.

## Project Structure

### Documentation (this feature)

```text
specs/012-bureau-refonte/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
├── proto-bureau.html     # prototype validé (fait foi pour le visuel)
├── checklists/requirements.md
└── tasks.md              # /speckit-tasks
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                         # +3 modèles, +colonnes
└── migrations/2026111x_bureau_012/       # additive, à la main

src/lib/
├── verification/code.ts                  # tirage, révocation, limite (remplace gestes.ts + jeton-geste.ts)
├── verification/motifs.ts                # motifs + conseils (modifié)
├── verification/lecture-code.ts          # OCR chiffres, au-dessus de fraude/lecture-photo.ts
├── moderation/cas.ts                     # cas dérivés, gravité, tri (pur)
├── moderation/gestes-lot.ts              # application idempotente d'un lot
├── moderation/gestes.ts                  # (existant) logique extraite des routes unitaires
├── moderation/avertissements.ts          # liste fermée
├── moderation/reperes.ts                 # repères + « le membre verra » (source unique, FR-020)
├── activite/agregats.ts                  # requêtes SQL d'agrégats
└── activite/recit.ts                     # phrases (pur)

src/app/api/
├── moderation/verify/code/route.ts       # nouveau ; geste/ supprimé à la fin
├── moderation/avertissement/…            # nouveau
├── moderation/relecture/route.ts         # nouveau
├── admin/membres/route.ts, [id]/route.ts # nouveau
├── admin/gestes/route.ts                 # nouveau
└── admin/activite/route.ts               # nouveau

src/app/(admin)/admin/
├── page.tsx                              # Activité (récit)
├── membres/page.tsx                      # hub (liste | fiche)
├── retours/page.tsx
└── outils/[outil]/page.tsx               # historique, guide, place, cercle, journal, fonctions, apparence, limites, retention

src/components/admin/                     # CaseCard, FicheMembre, MembreRow, SyncIndicator, graphiques du récit…
src/components/ui/                        # BottomSheet, UndoToast, SeverityStripe (génériques)
src/hooks/useGestes.ts                    # file optimiste, annulation, envoi groupé, sendBeacon
src/app/(main)/verify/page.tsx            # code + boucle de refus
next.config.ts                            # redirections des anciennes adresses
```

**Structure Decision**: on reste dans le monolithe Next.js existant. La logique pure (`cas.ts`, `recit.ts`, `code.ts`, `gestes-lot.ts`) est testée en unitaire, et les routes sont fines.

## Ordre et dépendances des stories

```text
US1 code manuscrit ──► US2 boucle de refus
US3 hub Membres ──► US4 fiche et gestes ──► US5 gestes par lots ──► US6 avertir/masquer
                                       └──► US8 navigation, retours, outils
US7 activité (indépendante ; a besoin de last_seen_at, déjà livré)
```

- **Lot 1** (P1) : US1 + US2, autonome, livrable seul.
- **Lot 2** (P1) : US3 + US4, le hub avec gestes unitaires via les routes existantes.
- **Lot 3** (P2) : US5 + US6.
- **Lot 4** (P2–P3) : US7 + US8.

Suivant la préférence de l'opérateur (une branche tampon par lot = un déploiement Vercel), chaque lot peut partir en une PR qui ferme ses issues.

## Risques

- **OCR sur l'écriture manuscrite** : la lecture sera souvent « impossible ». C'est acceptable, puisque ce n'est qu'un indice. On mesure son taux de lecture sur les 30 premiers selfies avant de le mettre en avant.
- **Coût de `GET /api/admin/membres`** : le calcul des cas dérivés à chaque page. À 200 comptes, c'est négligeable ; on garde l'`EXPLAIN` dans la PR.
- **Cache de Next 16** : l'API a changé (voir `AGENTS.md`). À vérifier avant de coder l'activité.
- **Transition du geste** : des demandes au geste peuvent rester en file. La carte affiche l'ancien geste tant qu'il en reste (FR-008).

## Complexity Tracking

Aucune violation de la constitution.
