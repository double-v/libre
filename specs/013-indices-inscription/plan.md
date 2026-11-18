# Implementation Plan: Indices réseau et image à l'inscription

**Branch**: `docs/013-indices-inscription` | **Date**: 2026-11-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-indices-inscription/spec.md`

## Summary

On ajoute trois familles d'indices de fiabilité (spec 010), lues **au moment
où un faux compte se montre le plus** : l'inscription, la connexion et le
téléversement des photos.

1. **Pays de connexion.** Il est lu dans l'en-tête `x-vercel-ip-country`,
   posé par l'hébergeur. Il est comparé au pays de la ville, que le serveur
   **déduit lui-même** des coordonnées : un point en France ou en outre-mer
   donne `FR`. Le nom de pays envoyé par le client n'est jamais cru seul.
2. **Nature du réseau.** L'adresse de la requête est cherchée dans une table
   embarquée de plages IPv4, générée hors ligne à partir de listes publiques
   (hébergeurs, VPN). Les sorties du relais privé d'Apple sont marquées pour
   ne jamais lever d'indice. L'adresse n'est jamais conservée.
3. **Déclaration d'IA dans l'image.** Avant le retrait des métadonnées, on
   parcourt **les seuls segments de métadonnées** du fichier : XMP, EXIF,
   C2PA en JPEG, PNG et WebP. On y cherche les termes IPTC
   `trainedAlgorithmicMedia` (générée, indice fort) et
   `compositeWithTrainedAlgorithmicMedia` (retouchée, indice faible), ainsi
   que quelques signatures de générateurs connus. Ni décodage d'image, ni
   réseau, ni validation cryptographique.

Seuls un code pays, une catégorie de réseau et une conclusion d'image sont
stockés, dans `profile_signals`, `users.pays_connexion_vus` et
`profiles.pays_ville`. Rien n'est sanctionné automatiquement. Les signaux
entrent dans le niveau de fiabilité et dans l'invitation automatique au
selfie qui existent déjà.

## Technical Context

**Language/Version**: TypeScript 5, Node 22 (fonctions Vercel)
**Primary Dependencies**: Next.js 16 App Router (`after()`), NextAuth 4 (`authorize(credentials, req)`), Prisma 7. Aucune dépendance nouvelle
**Storage**: PostgreSQL (Neon). Migration additive écrite à la main : 2 colonnes (`users.pays_connexion_vus TEXT[]`, `profiles.pays_ville CHAR(2)`), 4 nouveaux types de signaux sans changement de table, et un remplissage SQL de `pays_ville` pour les profils existants
**Testing**: Vitest (unitaire, routes avec bases factices qui honorent `where`/`select`), `npm run test:db` (vrai PostgreSQL pour la migration et le remplissage), mutations à la main, Playwright pour la fiche
**Target Platform**: Vercel Hobby ; navigateur pour la fiche admin
**Project Type**: application web Next.js monolithique
**Performance Goals**: < 50 ms ajoutées à l'inscription et à la connexion (SC-003) ; recherche dans la table en O(log n) ; module de table < 1 Mo, poids mesuré dans `next build`
**Constraints**: aucun service extérieur à l'exécution ; aucune adresse IP, aucun opérateur, aucun manifeste stocké ni journalisé ; aucune donnée de membre dans le contexte d'un agent ; dépôt public (modèle de menaces dans `securite.md`)
**Scale/Scope**: environ 200 comptes ; 3 points d'entrée serveur touchés (inscription, connexion, téléversement de photo), plus la modification de ville ou de position ; aucune nouvelle route ; aucun nouvel écran (lignes ajoutées à la fiche existante)

## Constitution Check

| Principe | Verdict | Commentaire |
|---|---|---|
| I. L'humain d'abord | ✅ | Rien ne change pour le membre. Aucune sanction automatique, aucun refus d'inscription. Les cas légitimes (voyage, expatriation, frontalier, relais Apple) sont protégés par la force faible et par la règle des trois types |
| II. Français, copie inclusive | ✅ | Libellés et mentions légitimes en phrases complètes, pays en clair via `Intl.DisplayNames('fr')` |
| III. Vie privée | ✅ | Minimisation : un code pays, une catégorie, une conclusion. Les nouveaux champs sont ajoutés à la garde de non-fuite. Politique de confidentialité mise à jour dans la même PR que le traitement (FR-019). Agrégats de suivi avec les cases < 5 masquées (SC-005) |
| IV. Design System | ✅ | Aucun composant nouveau : la fiche réutilise la liste de signaux de la spec 012 |
| V. Pixel | ✅ | Pas de nouvelle surface, donc pas de prototype. Captures de la fiche à 360 px et 1280 px avant `ready` (voir `quickstart.md`) |
| VI. Ticket = maille | ✅ | Une issue par user story (4). Deux lots proposés : lot 1 = US1 + US2, lot 2 = US3 + US4 |

Aucune violation à justifier. Revérifié après la phase 1 : inchangé.

## Project Structure

### Documentation (this feature)

```text
specs/013-indices-inscription/
├── spec.md
├── plan.md              # ce fichier
├── research.md          # R1–R9 : sources, formats, accroches
├── data-model.md        # colonnes, types de signaux, table des réseaux
├── securite.md          # modèle de menaces M1–M12
├── quickstart.md        # validation de bout en bout
├── contracts/
│   └── indices.md       # contrats des modules et des signaux
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/lib/connexion/
├── pays.ts              # paysConnexion(headers) · paysVille(coords, nomPays) · memePays(a, b)
├── territoires.ts       # boîtes France + outre-mer, codes ISO des territoires
├── reseau.ts            # categorieReseau(ip) : recherche dichotomique
├── table-reseaux.generated.ts   # généré, daté, jamais édité à la main
└── indices.ts           # observerConnexion({ userId, headers, ip }) : tout le best-effort
src/lib/photo-ia.ts      # declarationIA(buffer) : 'generee' | 'retouchee' | null
src/lib/fraude/signaux.ts, fiabilite.ts, libelles.ts   # nouveaux types et libellés
src/lib/r2.ts            # televerserPhoto rend aussi `ia`
src/lib/auth.ts          # authorize(credentials, req) → after(observerConnexion)
src/app/api/auth/register/route.ts      # after(observerConnexion)
src/app/api/users/profile/route.ts      # pays_ville + réévaluation
src/app/api/geoloc/update/route.ts      # pays_ville + réévaluation
src/app/api/users/photos/route.ts       # televerserPhoto + signal IA
src/app/api/moderation/verify/route.ts  # signal IA sur le selfie
src/lib/moderation/fiche.ts, reperes.ts # lecture en clair, repères
scripts/reseaux/generer-table.mjs       # sources → table générée
scripts/agregats/indices-013.ts         # SC-005, agrégats seulement
prisma/migrations/2026111x_indices_connexion/migration.sql
src/__tests__/city-label-never-leaks.test.ts   # nouveaux champs privés
```

**Structure Decision**: tout le calcul de connexion est dans
`src/lib/connexion/`, en fonctions pures testables sans HTTP, plus un seul
point d'effet (`observerConnexion`). La lecture d'IA est une fonction pure
sur un `Buffer`. Les routes ne font qu'appeler ces fonctions dans `after()`.

## Doctrine de test (reprise de la spec 012)

- **Rouge prouvé** avant chaque code, consigné dans la PR.
- **Effets observés** : des lignes de `profile_signals` dans une base factice
  qui honore `where`, `select` et la contrainte `@@unique([userId, cle])`.
  On n'asserte jamais un simple appel de mock.
- **Vrai PostgreSQL** (`npm run test:db`) pour la migration, le remplissage
  de `pays_ville`, l'ajout dédoublonné et plafonné dans
  `pays_connexion_vus`, et l'unicité des signaux sous course (barrière).
- **Fichiers réels** pour la lecture d'IA : des images minuscules forgées
  dans les tests (JPEG avec XMP, JPEG avec APP11/JUMBF, PNG `iTXt` et
  `caBX`, WebP `XMP `), plus des fichiers piégés (segment de longueur
  démesurée, segment tronqué, 10 000 segments).
- **Mutations à la main** sur les gardes : outre-mer, code invalide, relais
  Apple prioritaire, segments de métadonnées seulement, terme « composite »
  avant « trained ». Les survivants sont corrigés ou justifiés comme
  équivalents.
- **Non-fuite** : la garde `city-label-never-leaks` couvre
  `pays_connexion_vus` et `pays_ville`. Un test vérifie que les journaux
  d'`observerConnexion` ne contiennent jamais l'adresse.

## Revue avant chaque PR

1. `/code-review high` sur le diff.
2. `/revue-metier` : le lot écrit des données de membres et ajoute une
   passe automatique.
3. Relecture de `securite.md` : chaque menace touchée a son test hostile
   nommé dans le corps de PR.

## Complexity Tracking

Aucune violation. Seul choix à surveiller : la table des réseaux est une
**donnée tierce** embarquée dans le bundle. Sa licence, sa taille et son
âge sont contrôlés (R3, M9, M10).
