# Implementation Plan: Questions de profil en miroir

**Branch**: `feat/009-questions-miroir` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-questions-miroir/spec.md`

## Summary

Une banque de questions ouvertes versionnée dans le code
(`src/lib/questions.ts`, clés stables, 89 questions en 9 thèmes + 24 « Ceci ou
cela », trois formats : ouverte, choix + précision, ceci-ou-cela), une table
`profile_answers` (une réponse par question, sans limite de nombre ; choix
et/ou texte 0–300), et une décision miroir unique
`answersFor` (même famille que `intentionFor`, spec 008) appliquée à la
sérialisation de la fiche : une réponse d'autrui n'est envoyée que si la
lectrice a répondu à la même question ; sinon l'intitulé et
`veiled: true`. La saisie se fait dans le profil (par thèmes, « Répondre à la suite »,
« Ceci ou cela ») et **en place** dans la fiche, sous la question voilée. La détection de contact du pseudo (#459) est
extraite dans `src/lib/contact.ts` et partagée. Modération : réponses jointes
au signalement côté admin, retrait journalisé dans `ModerationLog`.

## Technical Context

**Language/Version**: TypeScript 5 / Next.js 16 App Router (React 19)

**Primary Dependencies**: Prisma 7 (`@prisma/adapter-pg`), NextAuth 4, Tailwind v4, zod

**Storage**: PostgreSQL (Neon) — **une table additive** `profile_answers` (migration à la main, cascade à la suppression du compte).

**Testing**: Vitest + Testing Library (CI) ; Playwright chromium en cache pour le gate visuel (local, base PostgreSQL locale)

**Target Platform**: web mobile-first (PWA), desktop ≥ md

**Project Type**: application web (front + API dans le même dépôt Next.js)

**Performance Goals**: la fiche fait deux lectures de plus au plus (réponses de la personne lue, clés des réponses de la lectrice), par index `(userId)` ; aucun effet sur Découvrir (les cartes n'affichent pas les réponses).

**Constraints**: fermé par défaut (principe III) ; copie sans chiffre ni comparaison ; DS existant ; prototype validé avant l'UI (principe V) ; contenu des messages chiffré, donc la mesure SC-003 ne lit jamais les messages.

**Scale/Scope**: ~115 comptes ; 1 table, 1 module de banque (120 entrées), 1 module de règle, 3 routes membre + 1 route admin, 1 section profil + 2 modes (à la suite, ceci ou cela), 1 bloc de fiche, 1 ajout à l'admin des signalements.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Vérification | État |
|---|---|---|
| I. L'humain d'abord | Répondre est facultatif (FR-010) ; les questions donnent des points d'accroche pour un premier message, pas une mécanique de rétention ; aucune réaction, aucun compteur. | ✅ |
| II. Français, copie inclusive | Banque relue par l'opérateur ; aucune question qui suppose un corps, une mobilité, une situation (« sortir », « voyager » évités ou ouverts). | ✅ |
| III. Vie privée | Voile à la sérialisation, recalculé à chaque lecture ; lectrice en échec → tout voilé ; refus des contacts à l'écriture ; garde de non-fuite par route ; export et cascade (FR-013). | ✅ |
| IV. Design System | Pas de composant de base nouveau : Input multiligne, Button, TagButton, ligne voilée de la spec 008 (`IntentionLine`) comme modèle. | ✅ |
| V. Le pixel juge | Prototype (section profil par thèmes, « Répondre à la suite », pastilles + précision, « Ceci ou cela », fiche en commun d'abord / voilées / saisie en place) **à valider avant l'UI**. | ⏳ gate avant UI |
| VI. Ticket = maille | 3 user stories → 3 issues ; un lot = une PR. | ✅ |
| Migrations additives à la main | `CREATE TABLE profile_answers` + index + contrainte d'unicité. | ✅ |
| Effets post-persist best-effort | Aucun effet de bord (pas de notification à la réponse). | ✅ |

Aucune violation. Pas de Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/009-questions-miroir/
├── plan.md · research.md · data-model.md · quickstart.md
├── contracts/answers-api.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                                  # + model ProfileAnswer
└── migrations/2026MMDD_profile_answers/           # table, index, unicité

src/lib/
├── contact.ts            # extrait de pseudo.ts : contientUnContact (pseudo, réponses, #443)
├── pseudo.ts             # importe contact.ts
├── questions.ts          # banque : clé, thème, format, options, intitulé, aide, état
└── answers.ts            # answersFor (miroir, tri « en commun d'abord »), validateAnswer (par format)

src/app/api/
├── users/me/answers/route.ts          # GET (les miennes), PUT (créer/modifier par clé), DELETE
├── users/[id]/route.ts                # + answers via answersFor
├── users/me/export/route.ts           # + réponses
└── admin/answers/[id]/route.ts        # PATCH retrait (ModerationLog)

src/components/
├── ProfileAnswers.tsx                 # section du profil : thèmes, « Répondre à la suite », retirer
├── ThisOrThat.tsx                     # mode « Ceci ou cela »
├── AnswerInput.tsx                    # saisie selon le format (pastilles + précision, texte)
├── AnswerBlock.tsx                    # fiche : réponse / voilée + saisie en place
└── ProfileModal.tsx                   # intègre AnswerBlock

src/app/(admin)/admin/reports/…        # réponses du profil signalé + retrait

src/__tests__/answers-never-leak.test.ts   # garde par route
```

**Structure Decision**: application Next.js unique existante.

## Complexity Tracking

Aucune violation à justifier.
