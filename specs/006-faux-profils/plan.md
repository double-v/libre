# Implementation Plan: Détection des faux profils

**Branch**: `docs/006-faux-profils` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-faux-profils/spec.md`

## Summary

Démasquer les comptes du type du 2026-09-24 (photo volée, contact Telegram
incrusté, arnaque aux coupons prépayés hors de l'app) **sur le profil**, pas sur
les messages. Deux volets :

- **Outil de modération** : recherche d'image inversée en un clic (Lens,
  Yandex, TinEye) par redirection journalisée vers une URL signée 15 min.
- **Signaux calculés chez nous** : contact externe dans le pseudo et la bio
  (refusé à l'écriture) et **lu sur les photos** (`tesseract.js`, mesuré à
  ≈ 0,3 s/photo) ; même photo sur plusieurs comptes (dHash `sharp`, seuil 8) ;
  forme de photo « récupérée » (indice faible). Tout nourrit une file admin
  « Profils à vérifier » où un humain tranche : rien, mise en retrait jusqu'au
  badge (#436), ou bannissement.

## Technical Context

**Language/Version**: TypeScript 5, Node 22 (runtime Node des routes Next)
**Primary Dependencies**: Next.js 16 App Router, Prisma 7 (`@prisma/adapter-pg`), `sharp` (déjà là), **`tesseract.js` 7 + `@tesseract.js-data/eng`** (nouvelles, R1/R5)
**Storage**: PostgreSQL (Neon) — 4 tables, 1 champ (`data-model.md`) ; R2 inchangé
**Testing**: Vitest (+ Testing Library), Playwright local pour les pixels
**Target Platform**: Vercel (fonctions Node), PWA
**Project Type**: application web Next.js (front + routes API dans le même dépôt)
**Performance Goals**: aucune action membre ralentie (analyse dans `after()`) ; signal en file < 5 min après l'ajout d'une photo (SC-001)
**Constraints**: aucun nouveau sous-traitant ; aucune photo envoyée à un tiers sans geste de modérateur ; aucun signal visible d'un membre ; lock npm non régénéré (R5)
**Scale/Scope**: quelques dizaines de profils, quelques centaines de photos ; comparaison d'empreintes en mémoire

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Verdict | Pourquoi |
|---|---|---|
| I. L'humain d'abord | ✅ | Aucun ressort d'engagement ; aucune sanction automatique (FR-017) ; la mise en retrait se lève par un geste de 2 minutes. |
| II. Français, copie inclusive | ✅ | La règle de la bio énonce sans accuser ; l'invitation au badge ne mentionne aucun soupçon (FR-012). |
| III. Vie privée invariant | ✅ sous conditions | Traitement chez nous ; seule la recherche manuelle sort une photo, sur geste admin journalisé ; signaux et `retraitAt` privés avec **test de non-fuite par route** ; durées dans `regles.ts` donc dans §5 ; empreintes de comptes bannis sans photo, 1 an. La politique doit décrire la finalité (lutte contre la fraude, intérêt légitime) — tâche dédiée. |
| IV. Design System fait loi | ✅ | File admin et invitation construites avec `Card`, `Tag`, `Button`, `Alert` ; aucun composant hors bibliothèque sans passage par `DESIGN.md`. |
| V. Le pixel est le seul juge | ✅ | Prototype de `/admin/profils` et de l'invitation en retrait à valider **avant** d'intégrer ; captures Playwright clair/sombre avant merge. |
| VI. Ticket = maille | ✅ | Une issue par user story (5), une PR par issue ; l'opérateur merge. |

Re-vérifié après la Phase 1 : aucun écart. Point de vigilance consigné dans
Complexity Tracking : la nouvelle dépendance lourde (R1).

## Project Structure

### Documentation (this feature)

```text
specs/006-faux-profils/
├── spec.md
├── plan.md              # ce fichier
├── research.md          # R1–R8, mesures de l'essai du 2026-09-24
├── data-model.md
├── contracts/api.md
├── quickstart.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/lib/fraude/
├── contact.ts             # detecterContact(texte) — R3, pur, testé en tableau
├── empreinte.ts           # dHash + distance — R2
├── forme-photo.ts         # indice « photo récupérée » — R4
├── lecture-photo.ts       # OCR tesseract.js, worker réutilisé — R1
├── signaux.ts             # enregistrer un signal (dédup par cle), règle d'entrée en file
├── analyse.ts             # analyserPhoto / analyserTexte / rattrapage par lots
└── visibilite.ts          # visiblePourAutrui (isBanned + retraitAt) — R8

src/app/api/admin/photos/recherche/route.ts             # US1
src/app/api/admin/profils-a-verifier/route.ts           # US4 liste
src/app/api/admin/profils-a-verifier/[userId]/route.ts  # US4 décision
src/app/api/admin/profils-a-verifier/analyse/route.ts   # FR-011
src/app/(admin)/admin/profils/page.tsx                  # US4 (prototype d'abord)
src/components/AdminPhotoSearch.tsx                     # US1, fiche membre + file
src/components/RetraitNotice.tsx                        # invitation membre en retrait

# modifiés
src/app/api/users/photos/route.ts        # after(analyserPhoto)
src/app/api/users/profile/route.ts       # FR-020 (bio)
src/app/api/users/me/route.ts, register  # FR-020 (pseudo)
src/app/api/moderation/report/route.ts   # motif fake → signal
src/app/api/admin/verifications/[id]/route.ts  # badge approuvé → retraitAt = null
src/app/api/{discover,geoloc/*,users/[id],circle/contacts,…}  # visiblePourAutrui
src/lib/retention/{regles,purge}.ts      # empreintesBannies, signauxTranches
src/app/(legal)/confidentialite/page.tsx # finalité anti-fraude
src/__tests__/signaux-never-leak.test.ts # non-fuite
src/__tests__/visibilite-gardes.test.ts  # toute route listant des profils filtre le retrait
```

**Structure Decision**: application Next.js unique existante ; la logique de
détection vit dans `src/lib/fraude/` (pure et testable sans base), les routes
restent minces.

## Découpage en issues (une par user story)

| Story | Priorité | Contenu | Dépend de |
|---|---|---|---|
| US1 Recherche inversée | P1 | route redirect + composant, fiche membre | — |
| US2 Contact externe | P1 | `contact.ts`, refus bio/pseudo, OCR photos, **table des signaux** | — |
| US4 File + décisions | P2 | page admin, décisions, retrait, compteur, rattrapage | US2 (signaux) |
| US3 Photo réutilisée | P2 | empreintes, copie au bannissement, rétention 1 an | US4 (bannissement depuis la file) |
| US5 Indice faible | P3 | `forme-photo.ts` | US2 |

Ordre de livraison conseillé : US1 → US2 → US4 → US3 → US5. US1 sert dès
demain sur chaque signalement « Faux profil ».

## Complexity Tracking

| Écart | Pourquoi c'est nécessaire | Alternative plus simple écartée parce que |
|---|---|---|
| Dépendance `tesseract.js` (+44 Mo décompressés) | Le signal le plus fort du cas réel est **sur la photo** ; sans lecture du texte, US2 ne voit que la bio. | Google Vision : sous-traitant hors UE, hors périmètre fixé par l'opérateur. OCR navigateur : contournable. |
| Greffe manuelle du lock (R5) | Le lock vient d'un npm plus récent que la machine ; le régénérer supprime des champs `libc` (incident #333). | `npm install` : casse la sélection des binaires natifs. |
