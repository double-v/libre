# Implementation Plan: Indice de fiabilité et invitation automatique à la vérification

**Branch**: `docs/010-indice-fiabilite` | **Date**: 2026-10-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-indice-fiabilite/spec.md`

## Summary

Prolonger la spec 006 du **profil** vers le **comportement**. Huit nouveaux
types de signal, calculés chez nous, sans sous-traitant ni IA, dans la table
`profile_signals` existante :

- **forts** : bloqué à répétition, retour d'un banni (empreintes HMAC de
  l'appareil et de l'e-mail, 1 an), lexique de l'arnaque, rafale de likes ;
- **faibles (contexte)** : appareil partagé, fuseau incohérent, profil monté
  d'un coup, inscriptions groupées (IP en HMAC, 7 jours).

Une fonction pure `niveauFiabilite` dérive trois niveaux (fiable · à surveiller
· douteux) des signaux non tranchés. Au niveau « douteux », un compte non
vérifié reçoit **automatiquement une invitation** au selfie — bandeau, sans
effet sur sa visibilité (clarification B, art. 22) — et entre dans la file ;
le retrait reste un geste de modérateur. Admin › Membres gagne un filtre et un
tri par niveau ; la fiche liste les indices qui le composent.

## Technical Context

**Language/Version**: TypeScript 5, Node 22 (runtime Node des routes Next)
**Primary Dependencies**: Next.js 16 App Router, Prisma 7 (`@prisma/adapter-pg`), `node:crypto` (HMAC, HKDF) — **aucune nouvelle dépendance**
**Storage**: PostgreSQL (Neon) — 2 tables, 1 champ, 1 colonne rendue facultative (`data-model.md`)
**Testing**: Vitest (+ Testing Library), Playwright local pour les pixels
**Target Platform**: Vercel Hobby (fonctions Node), PWA
**Project Type**: application web Next.js (front + routes API dans le même dépôt)
**Performance Goals**: aucune action membre ralentie (tout dans `after()`) ; signal en file < 5 min (SC-002) — en pratique à la requête suivante
**Constraints**: aucun sous-traitant, aucune IA, aucune donnée en clair nouvelle (appareil, e-mail, IP, fuseau : HMAC ou booléen) ; indice et signaux jamais lus par un membre ; aucune sanction automatique ; free tier Vercel (requêtes indexées, pas de cron)
**Scale/Scope**: ≈ 170 comptes, quelques milliers de likes ; niveaux calculés en mémoire pour la liste admin

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Verdict | Pourquoi |
|---|---|---|
| I. L'humain d'abord | ✅ | Aucun ressort d'engagement. L'invitation ne masque rien et ne coupe rien (FR-017) ; toute sanction est un geste humain journalisé (FR-022). |
| II. Français, copie inclusive | ✅ sous vigilance | Invitation sans motif, sans chiffre, sans soupçon, en phrases complètes (FR-018). Le fuseau est un indice **faible** : il ne doit jamais devenir un proxy d'origine (R6). |
| III. Vie privée invariant | ✅ sous conditions | HMAC à clé dérivée pour appareil, e-mail, IP ; fuseau réduit à un booléen ; durées dans `regles.ts` (donc dans la politique) ; **garde de non-fuite étendue** aux nouveaux champs ; politique de confidentialité amendée dans le même lot que la première donnée nouvelle (US1). |
| IV. Design System fait loi | ✅ | Bandeau = variante de `RetraitNotice` (même `Alert`) ; filtre admin avec les contrôles existants de la liste ; niveaux en `Tag`. |
| V. Le pixel est le seul juge | ✅ | Prototype du bandeau d'invitation et du filtre/bloc d'indices admin **avant** intégration ; captures Playwright clair/sombre. |
| VI. Ticket = maille | ✅ | Une issue par user story ; lot possible en une PR tampon (préférence opérateur). |

Re-vérifié après la Phase 1 : un écart consigné (journal de modération sans
auteur humain, Complexity Tracking).

## Project Structure

### Documentation (this feature)

```text
specs/010-indice-fiabilite/
├── spec.md
├── plan.md              # ce fichier
├── research.md          # R1–R9
├── data-model.md
├── contracts/api.md
├── quickstart.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/lib/fraude/
├── empreinte-identite.ts  # hmacIdentite(kind, valeur) — clé HKDF(NEXTAUTH_SECRET) — R1
├── lexique.ts             # detecterLexique(texte) — liste fixe, pur, testé en tableau — R4
├── comportement.ts        # verifierBlocages / verifierRythmeLikes / verifierProfilExpress — R2, R3, R7
├── inscription.ts         # analyserInscription : retour de banni, appareil partagé, IP groupées — R1, R5
├── fuseau.ts              # fuseauIncoherent(tz, lat, lng) — R6
├── fiabilite.ts           # niveauFiabilite + douteSerieux (purs) — R8
├── invitation.ts          # evaluerCompte(userId) : niveau → invitation + journal — R9
├── signaux.ts             # (modifié) nouveaux types, familles, dansLaFile amendée — R8
└── bannissement.ts        # (modifié) retenir aussi appareil + e-mail

# modifiés
src/app/api/auth/register/route.ts           # after(analyserInscription)
src/app/api/blocks/route.ts                  # after(verifierBlocages)
src/app/api/likes/route.ts                   # after(verifierRythmeLikes, verifierProfilExpress)
src/app/api/users/profile/route.ts           # lexique (bio) ; fuseau à l'enregistrement de la ville ; invitation lue par soi
src/app/api/users/me/pseudo/route.ts         # lexique (pseudo)
src/app/api/admin/verifications/[id]/route.ts  # badge → invitation levée ; refus → signal
src/app/api/admin/users/route.ts             # ?niveau= &tri=fiabilite
src/app/api/admin/users/[id]/route.ts        # bloc indices
src/app/api/admin/profils-a-verifier/analyse/route.ts  # rattrapage FR-025
src/components/RetraitNotice.tsx             # variante « invitation »
src/app/(admin)/admin/users/page.tsx, [id]/page.tsx    # filtre, tri, indices (prototype d'abord)
src/app/(auth)/…, composant de saisie de ville          # envoi du fuseau navigateur
src/lib/retention/{regles,purge}.ts          # tracesInscription 7 j, empreintesIdentiteBannies 1 an
src/app/(legal)/confidentialite/page.tsx     # finalité, catégories, durées, recours humain
src/__tests__/signaux-never-leak.test.ts     # étendu : verifInviteeAt, niveau, empreintes, ipHash
```

**Structure Decision**: même découpage que la spec 006 — détection pure et
testable dans `src/lib/fraude/`, routes minces qui planifient l'analyse dans
`after()`.

## Découpage en issues (une par user story)

| Story | Priorité | Contenu | Dépend de |
|---|---|---|---|
| US1 Signaux forts | P1 | blocages, retour de banni (+ empreintes identité), lexique, `fiabilite.ts`, `dansLaFile` amendée, **politique + rétention** des données nouvelles (socle US5) | — |
| US2 Invitation auto | P1 | rafale de likes, `evaluerCompte`, bandeau, levée par badge, journal sans auteur humain | US1 (niveau) |
| US4 Indices faibles | P3 | appareil partagé, IP groupées (+ traces 7 j), fuseau, profil express | US1 |
| US3 Indice admin | P2 | filtre, tri, bloc d'indices, rattrapage | US1 (utile après US4) |
| US5 Transparence | P2 | relecture d'ensemble de la politique, garde de non-fuite complète, quickstart | toutes |

Ordre conseillé : US1 → US2 → US4 → US3 → US5. Lot unique possible (branche
tampon) : la politique doit partir **avec** la première donnée nouvelle.

## Complexity Tracking

| Écart | Pourquoi c'est nécessaire | Alternative plus simple écartée parce que |
|---|---|---|
| `moderation_logs.adminId` devient facultatif | FR-020 : journaliser l'invitation automatique avec un auteur distinct d'un modérateur. | Attribuer l'action à un compte admin fictif : faux dans le journal, et un compte de plus à protéger. |
| Clé HMAC dérivée de `NEXTAUTH_SECRET` | Zéro configuration Vercel ; une empreinte d'e-mail non salée se renverse par dictionnaire. | Variable dédiée : si elle manque en prod, la détection s'éteint en silence (leçon des crons morts). Rotation du secret = perte des correspondances, acceptée et documentée. |
