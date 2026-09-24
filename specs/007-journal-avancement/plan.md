# Implementation Plan: Où en est Libre — journal d'avancement (MVP)

**Branch**: `docs/007-journal` (spec) → `feat/351-journal` (code) | **Date**: 2026-09-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/007-journal-avancement/spec.md`

## Summary

Une page publique `/journal`, rendue **statiquement** (`force-static` + ISR),
qui liste des publications rédigées dans l'admin. Le corps est un texte
restreint analysé maison et rendu par React, jamais en HTML brut. Chaque
publication passe un **contrôle éditorial** côté serveur : sept règles écrites,
motifs bloquants (e-mail, téléphone) et levables (le reste), levée par extrait,
case « règles relues » obligatoire. Un interrupteur « Commentaires du journal »,
coupé par défaut, prépare #352 grâce à une nouvelle colonne
`SiteConfig.featuresEnabled`.

## Technical Context

**Language/Version**: TypeScript, Next.js 16 App Router, React 19

**Primary Dependencies**: existantes uniquement — Prisma 7 (`@prisma/adapter-pg`), NextAuth 4 (admin), Tailwind v4. **Aucune dépendance ajoutée** (research R2).

**Storage**: PostgreSQL — table `journal_posts`, colonne `site_config.featuresEnabled` ; migrations additives écrites à la main.

**Testing**: Vitest (lib pures, routes, composants, gardes de source), Playwright local sur l'app servie (quickstart).

**Target Platform**: Vercel + Neon ; pages publiques servies statiquement et revalidées à la publication.

**Project Type**: application web (Next.js monolithe).

**Performance Goals**: pages publiques statiques (aucune requête base par visite hors revalidation).

**Constraints**: aucune lecture de session sur `/journal/**` (FR-004) ; aucun `dangerouslySetInnerHTML` ; tokens uniquement ; aucun défilement horizontal.

**Scale/Scope**: quelques publications par mois, un à trois admins.

## Constitution Check

| Principe | Verdict | Comment |
|---|---|---|
| I. L'humain d'abord | ✅ | Pas de badge, pas de compteur, pas de notification ; lecture calme. |
| II. Français, copie inclusive | ✅ | Toute la copie en français, signée « L'équipe Libre ». |
| III. Vie privée invariant | ✅ | Garde-fous éditoriaux (aucune donnée identifiante publiée ; e-mail/téléphone bloquants) ; page qui ne lit jamais la session, **garde de source** + `force-static` ; journal sans extraits. La promesse « aucune personnalisation » est adossée à un test (corollaire #328). |
| IV. Design System | ⚠️ sous condition | Deux besoins non couverts par `src/components/ui/` : rendu de texte long (`Prose`) et bloc d'alertes éditoriales (réutiliser `Alert` si suffisant). **Proposition dans `DESIGN.md` avant le code** (tâche dédiée). |
| V. Pixel seul juge | ✅ sous condition | Prototype (liste, publication, rédaction avec alertes) validé avant le code d'interface ; captures sur l'app servie avant merge. |
| VI. Ticket = maille | ⚠️ dérogation assumée | Un lot = une PR (#351), stories en étapes ; préférence opérateur « branche tampon par lot » (research R7). |

Pas de violation non justifiée. Re-vérifié après la phase 1 : inchangé.

## Project Structure

### Documentation (this feature)

```text
specs/007-journal-avancement/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/api.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                                   # JournalPost, SiteConfig.featuresEnabled
├── migrations/20260925100000_journal_posts/        # table + index
└── migrations/20260925100100_features_enabled/     # colonne additive

src/lib/journal/
├── texte.ts                  # analyseur texte restreint → arbre (R2)
├── regles.ts                 # 7 règles éditoriales + motifs (R3)
├── garde-fous.ts             # controler(), verifierPublication()
├── slug.ts                   # slug figé à la 1re publication
└── __tests__/
src/lib/features.ts           # DEFAUTS, journal_comments, 2 colonnes (R4)
src/lib/features-server.ts    # lecture des 2 colonnes

src/components/ui/Prose.tsx                   # si validé dans DESIGN.md
src/components/journal/TexteJournal.tsx       # rendu de l'arbre (serveur + aperçu admin)
src/components/journal/CarteJournal.tsx       # entrée de liste
src/components/admin/JournalEditeur.tsx       # rédaction, aperçu, alertes, publication

src/app/journal/page.tsx                      # force-static, liste
src/app/journal/[slug]/page.tsx               # force-static, publication + OG
src/app/(admin)/admin/journal/page.tsx        # liste admin
src/app/(admin)/admin/journal/[id]/page.tsx   # éditeur
src/app/api/admin/journal/route.ts            # GET, POST
src/app/api/admin/journal/[id]/route.ts       # GET, PUT, DELETE
src/app/api/admin/journal/[id]/publier/route.ts
src/app/api/admin/journal/[id]/depublier/route.ts
src/app/api/admin/journal/controle/route.ts
src/app/sitemap.ts                            # async, + journal

src/__tests__/journal-sans-session.test.ts    # garde de source (R1)
```

**Structure Decision**: monolithe Next.js existant ; logique pure dans
`src/lib/journal/` (testable sans base), routes minces, composants de rendu
partagés entre la page publique et l'aperçu admin (FR-010).

## Phasage

1. **Fondations** : schéma + migrations, `lib/journal` (texte, règles, garde-fous, slug) en TDD, `DEFAUTS` des fonctionnalités.
2. **US3 + US2 côté serveur** : routes admin, recontrôle serveur, journal de modération, revalidation.
3. **Prototype** (gate V) : liste, publication, état vide, écran de rédaction avec alertes — validation opérateur.
4. **US1** : pages publiques statiques + garde de source + sitemap.
5. **US2/US3 côté admin** : éditeur, aperçu, alertes, publication.
6. **US4** : points d'entrée ; **FR-023** : interrupteur dans `/admin/features`.
7. **Validation** : quickstart sur l'app servie, captures clair/sombre.

## Complexity Tracking

| Écart | Pourquoi | Alternative plus simple écartée |
|---|---|---|
| Deuxième colonne de fonctionnalités (`featuresEnabled`) | exprimer « coupé par défaut » sans migrer les données existantes | sentinelle dans `featuresDisabled` : illisible et casse la normalisation |
| Analyseur de texte maison | pas de dépendance, surface de rendu minimale et testée | `react-markdown` + sanitizer : dépendances lourdes, lock fragile |
