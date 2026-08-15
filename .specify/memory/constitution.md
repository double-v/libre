# Constitution — Libre (getlibre)

> Cette charte est **dérivée** de `CLAUDE.md`, `PRODUCT.md` et `DESIGN.md` du
> dépôt. Elle s'amende **là-bas d'abord**, puis se répercute ici — jamais
> l'inverse. Chaque commande spec-kit la charge avant de produire un artefact.

## Core Principles

### I. L'humain d'abord, pas la métrique

Libre est une app de rencontre qui refuse les ressorts d'addiction. Aucune
fonctionnalité ne se justifie par l'engagement qu'elle produit. Les récompenses
restent subtiles, la densité douce, et l'inclusion **silencieuse** : on ne badge
pas l'inclusion, on la pratique. Une spec qui augmente le temps passé sans
augmenter la qualité des rencontres est à réécrire.

### II. Le français, et une copie qui n'exclut personne

Code, commentaires, commits, corps de PR et **toute** la copie d'interface sont
en français. Tutoiement sans familiarité déplacée. Jamais de formulation
excluante : « Croisements en chemin », pas « IRL ». Les libellés décrivent ce
que la personne obtient, pas comment le système est construit.

### III. La vie privée est un invariant, pas une option

Chiffrement E2E des messages (ECDH P-256 + AES-256-GCM), GPS flouté côté client,
distances en tranches anti-trilatération, rate limiting par endpoint, whitelist
des champs modifiables. **Une donnée sensible se ferme par défaut** : sur un
champ personnel, l'échec de la règle doit fermer l'accès, jamais l'ouvrir.

Corollaire acquis à la dure (#328) : **une promesse affichée dans l'UI doit être
adossée à du code et à un test de non-régression par route**. Une phrase qui
décrit une garantie inexistante est un défaut de sécurité, pas un défaut de
copie.

### IV. Le Design System fait loi

Zéro valeur inline : couleurs, ombres, rayons et polices passent par les tokens
de `globals.css`. Tout composant d'interface existe dans `src/components/ui/` ;
un besoin non couvert se propose dans `DESIGN.md` **avant** d'écrire du code.
Toute animation a son `prefers-reduced-motion`. Cibles tactiles ≥ 44 px, focus
ring coral. Deux axes de theming orthogonaux (mode × skin) — aucune nouvelle DA.

### V. Le pixel est le seul juge du visuel (NON NÉGOCIABLE)

Une CI verte et des tests qui assertent une classe CSS ne prouvent rien sur un
rendu. Toute intégration front passe deux gates : **prototype validé** par
l'opérateur avant de coder, puis **vérification sur l'app réellement servie**
avant de merger. Mesurer un élément en échantillonnant plusieurs points, jamais
son seul centre.

### VI. Le ticket est la maille, l'opérateur est le checkpoint

Une **user story** = une issue = une PR = un checkpoint. Le corps de PR contient
`Closes #N`. L'agent ne merge pas de lui-même, sauf autorisation explicite pour
des PR précises. On ne travaille jamais sur le checkout principal servi :
`git worktree add`, nettoyé avec `git worktree remove`.

## Contraintes techniques

- **Stack** : Next.js 16 App Router (React 19, Server Components par défaut),
  Tailwind v4, Prisma 7 + PostgreSQL/PostGIS, NextAuth 4 (JWT), Pusher,
  Cloudflare R2, Vitest + Playwright, déploiement Vercel + Neon.
- **Migrations** : additives et écrites à la main. `migrate dev` est proscrit —
  la base de développement est partagée. La CI puis Vercel appliquent.
- **Schéma ↔ base** : un champ ajouté au schéma sans migration produit une
  colonne manquante et un 500 en production. Les deux bougent ensemble.
- **Effets de bord post-persist** (Pusher, R2, e-mail) : toujours en
  best-effort dans un `try/catch`, jamais capables d'annuler une écriture déjà
  actée.

## Gates de qualité

Aucune PR ne part sans ces quatre passages en local :

1. `npx vitest run` — la logique, en TDD.
2. `npx tsc --noEmit` — la CI ne lance pas `next build`, Vercel si.
3. `npx eslint` — le job CI échoue sur *erreur*, pas sur warning.
4. Le gate visuel du principe V, dès que le diff touche `*.tsx` / `*.css` /
   tokens.

## Governance

Cette constitution prime sur les habitudes de code. Un amendement se fait
d'abord dans les fichiers de charte du dépôt (`CLAUDE.md`, `PRODUCT.md`,
`DESIGN.md`), puis se reporte ici avec une montée de version : **MAJOR** pour un
principe retiré ou redéfini, **MINOR** pour un principe ajouté, **PATCH** pour
une clarification. Une spec qui contredit un principe doit soit être réécrite,
soit s'accompagner d'un amendement assumé.

**Version**: 1.0.0 | **Ratified**: 2026-08-15 | **Last Amended**: 2026-08-15
