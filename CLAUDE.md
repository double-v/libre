# Règles communes — développement sur ce serveur

<!-- server-rules-start -->
# Règles communes — développement sur Advantech

Ce fichier est la source unique des règles partagées par tous les projets hébergés
sur ce serveur (`advantech`, 192.168.1.116). Il est injecté dans chaque
`CLAUDE.md` de projet par `sync-claude-md.py`. Ne l'éditez pas à la main dans les
projets : vos modifications seraient écrasées au prochain sync.

## Conventions

- **Français partout** : code, commentaires, docstrings, commits, corps de PR.
  Les docstrings expliquent le *pourquoi*, pas le *quoi*.
- Commits : `feat(#NN): …`, `fix(#NN): …`, `docs(rex): …`.
- **Le corps de la PR doit contenir `Closes #N`.** Un titre `feat(#47): …` ne
  ferme rien : l'issue reste ouverte et désynchronise `state.md` (#39).
- **Ne merge pas de toi-même.** L'opérateur review et merge après chaque ticket,
  c'est son checkpoint — sauf pour les hotfixes explicitement autorisés. Même
  dans ce cas, le message de merge doit contenir `Closes #N`.
- **La PR s'ouvre en brouillon dès le premier push**, et le reste tant que le
  travail n'est pas fini. Ce n'est pas une convention de propreté : le brouillon
  est le seul signal « inachevé » que le juge *et* la boucle de reprise lisent
  tous les deux — `contract.py` viole le critère `pr` sur un brouillon (motif
  « la PR est en brouillon »), et `recover.py` classe une PR verte mais
  brouillon en `finish_draft`, pas en `merge`. La CI, elle, tourne sur les
  brouillons : on ne perd aucun retour.
- **Le passage en `ready` dépend du dépôt.**
  - Dépôt à **merge autonome** (documenté chez lui, `[merge] auto = true`) :
    l'agent fait `gh pr ready` lui-même, puis merge si le contrat est satisfait.
  - Dépôt **sans merge autonome**, c'est-à-dire le cas par défaut ci-dessus :
    la PR passe en `ready` **à la fin du développement et des tests**, et le
    merge reste le checkpoint de l'opérateur.
  **Surtout pas de passage précoce en `ready`.** Une PR marquée prête sur un
  travail en cours invite à une review sur un fragment ; sur un dépôt autonome,
  elle peut être mergée telle quelle. Oublier `gh pr ready` ne coûte qu'un
  retard, et il est visible : le contrat refuse en nommant le motif.

## GitHub — on n'écrit que chez soi

- **Toute écriture GitHub vise un dépôt de `double-v`.** Un verrou l'impose au
  moment de la commande (`claude-skills/guards/`), sur tous les harnais : shim
  `gh`/`git` en tête de PATH, hook Claude Code, refus opencode.
- **Dans un checkout qui porte un remote étranger, `gh` ne devine pas juste.**
  Le 2026-08-27, `gh issue create` tapé dans le fork `hublot` a ouvert l'issue
  chez `linuxserver/Heimdall` : sans `gh repo set-default`, gh résout le dépôt
  de base vers le parent. Le verrou refuse désormais ce cas plutôt que de
  choisir à ta place.
- Si un refus tombe : nomme la cible (`gh <verbe> -R double-v/<dépôt> …`) et
  fixe le défaut du checkout (`gh repo set-default double-v/<dépôt>`). Ne
  contourne pas par `/usr/bin/gh` — c'est refusé aussi, et c'est le point.
- Écrire hors périmètre est une décision d'opérateur, jamais d'agent.

## Worktrees et branches

- **Ne travaille jamais directement sur le checkout principal** quand il est la
  source de vérité servie. Pour coder, `git worktree add`.
- **Emplacement canonique** : crée les worktrees sous
  `/home/w/projects/.worktrees/<nom-du-projet>/<branche>/`. Ne les crée jamais
  dans un dossier sibling du checkout principal (`<projet>-wt/`) : OpenCode
  déclenche un `project copy refresh` qui supprime ces copies extérieures qu'il
  ne reconnaît pas comme faisant partie du projet (#429).
- Un worktree sur une branche `fix|feat|chore/…` est compté comme **ticket en
  vol** par `recover.py` et bloque les lancements. Pour du travail hors-ticket,
  préfixe la branche `docs/…`.
- Nettoie avec `git worktree remove`, **jamais** `rm -rf`. Une entrée
  « prunable » est lue comme un ticket en vol.

## Tests — trois gates

```sh
.venv/bin/python -m pytest          # back
# ou le venv du projet

npm test                            # front / E2E
```

- La **CI** ne lance en général que les tests backend. Les tests front et E2E
  tournent localement.
- Toute PR qui touche le front doit passer `npm test`.
- Les **E2E navigateur** sont le seul gate qui voie des pixels réels (viewport,
  empilement, recouvrement). `cd e2e && npm test` vise l'app servie.

## Spec-driven — spec-kit en amont du backlog

Sur les projets équipés (`.specify/` présent), une feature part d'une **spec**,
pas d'une issue improvisée :

```
/speckit-specify → /speckit-clarify → /speckit-plan → /speckit-tasks
                                                          ↓
                        une issue GitHub par user story (pas par tâche)
                                                          ↓
                                                       /ghwork → PR → merge
```

- Les artefacts vivent dans `specs/NNN-slug/` **du dépôt**, versionnés avec le
  code : ils voyagent dans la PR et restent lisibles par l'agent suivant.
- `.specify/memory/constitution.md` porte la charte du projet ; chaque commande
  spec-kit la charge. Elle s'amende ici puis se répercute là-bas, jamais l'inverse.
- Le cœur de spec-kit **ne crée aucune branche git** (c'est l'extension `git`,
  qu'on n'installe pas) : il est donc sans danger sur un checkout servi.
- La maille d'issue est la **user story**. Une issue = un ticket = une PR = un
  checkpoint opérateur. Une issue par tâche `T0NN` inonde le backlog.
- Le vault Obsidian indexe et commente ; il ne duplique pas les specs.

## État opérateur

Les fichiers d'état opérateur (ex. `.claude/ghwork-state.md`) sont pilotés par
la boucle et/ou édités à la main. Ils sont fréquemment modifiés-non-commités
pour de bonnes raisons : **ne les balaye pas dans un commit qui n'est pas le
sien**. Vérifie ton `git status` avant chaque commit.

## UI — charte stricte

- DA Minitel/vidéotex, tokens CSS existants (`--faint`, `--dim`, rampes
  `clamp()`), thèmes télétexte + ambre. **N'invente pas de nouvelle DA** :
  réutilise les composants et tokens existants.
- Un « les tests de classes passent » ne prouve rien sur des pixels. Deux gates :
  1. **Prototype validé** pour toute nouvelle surface.
  2. **E2E navigateur** pour vérifier l'app réellement servie.
- Règle de mesure : **échantillonner plusieurs points d'un élément, jamais son
  seul centre** — un toast ou un overlay peut couvrir une partie seulement.
<!-- server-rules-end -->

# Libre (getlibre) — Guide d'ingénierie

Application de rencontre Next.js + Prisma + PostgreSQL. Ce fichier garde le
*non-évident* du repo. Les décisions design détaillées vivent dans `DESIGN.md` ;
les principes produit dans `PRODUCT.md` ; les règles spécifiques Next.js dans
`AGENTS.md`.

## Repository

Le remote canonique s'appelle **`libre`** (`git@github.com:double-v/libre.git`).
Toujours pousser vers `libre`, pas vers `origin` (ancienne URL). Si `origin`
est encore présent, ne l'utilise pas.

## Stack

- **Framework** : Next.js 16 App Router (React 19, Server Components par défaut).
- **Styling** : Tailwind CSS v4 (`@theme` dans `src/app/globals.css`).
- **Base de données** : PostgreSQL + PostGIS (driver Prisma 7 avec adapter `@prisma/adapter-pg`).
- **Auth** : NextAuth.js 4, JWT strategy, custom Prisma adapter.
- **Temps réel** : Pusher (canaux privés authentifiés).
- **Stockage fichiers** : Cloudflare R2 via `@aws-sdk/client-s3`.
- **Tests** : Vitest + Testing Library + Playwright.
- **Déploiement** : Vercel + Neon.

## Commandes

```bash
npm install
# configurer .env d'abord (voir .env.example)
npx prisma generate
npx prisma migrate dev
npm run dev        # http://localhost:3000
npm run build      # prod : migrate + generate + build
npm run lint       # ESLint 9
npx vitest run     # tests unitaires + intégration
npx playwright test # E2E
```

## Lecture obligatoire avant de coder

Dans cet ordre :

1. **`PRODUCT.md`** — pourquoi le produit existe, persona, anti-références, 5
   principes (humain d'abord, chaleur, inclusion silencieuse, subtilité des
   récompenses, densité douce).
2. **`DESIGN.md`** — tokens couleur, typo, motion, components DS, shell unifié
   (#273), règles theming 2 axes (mode × skin), copy inclusive, safe-area.
3. **`AGENTS.md`** — règles spécifiques Next.js (version 16, breaking changes).

## Invariants de code

- **Copie en français uniquement** dans l'UI. "Tu" sans familiarité déplacée.
- **Zéro valeur inline** : couleurs, ombres, rayons, polices passent par les
  tokens Tailwind de `globals.css` (`@theme inline`).
- **Tout composant UI doit exister dans la Component Library** (`src/components/ui/`).
  Si un besoin n'y figure pas, le proposer dans `DESIGN.md` avant d'écrire du code.
- **Toute animation a son `prefers-reduced-motion: reduce`.**
- **Cibles tactiles ≥ 44 px**, focus ring coral.
- **Jamais de copie excluante** : "Croisements en chemin", pas "IRL" ; "à vous
  de choisir comment aller plus loin", pas "on se voit".

## Théming

Deux axes orthogonaux, gérés par `useThemePreference` :

- **Mode** (`light | dark | auto`) → classe `.dark` sur `<html>`.
- **Thème / skin** (`libre | libre-warm | cartoon | arcade | retro`) →
  `data-theme` sur `<html>`, registre `src/lib/site-themes.ts`.

Règles d'exposition :
- Landing + auth : **aucun** sélecteur (thème par défaut du site).
- App connectée : `ThemeToggle` (mode seul) dans `SiteNav`.
- Paramètres : `AppearanceSettings` pour skin + mode.
- Admin : `ThemeMenu` (popover complet mode×skin).

## Shell unifié (#273)

- **`SiteNav`** : nav unique sticky translucide, marque = pastille coral + cœur
  `HeartMark`. Variantes `guest` / `authed`. Remplace `TopNav`, `LobbyNav`, nav
  ad hoc `/manifesto`.
- **`SiteShell`** : conteneur central unique, largeur `content` (~1080px),
  `app` (512px) ou `reading` (720px).
- **Bottom tab bar** : nav principale mobile de l'app connectée (Découvrir,
  Messages, La Place, Profil), indépendante de `SiteNav`.
- **`data-lobby`** : marqueur home-only pour l'ambiance always-dark. La garde
  `lobby-confinement.test.ts` (#282) échoue si elle fuit hors de la home.

## Sécurité

- Messagerie chiffrée de bout en bout : ECDH P-256 + AES-256-GCM entre les appareils.
- Vault/escrow actif par défaut : la clé privée de chaque compte est chiffrée côté
  serveur (`CHAT_ESCROW_KEY`) et restituée via `GET /api/users/keys/me`. Le
  service a donc une **capacité technique de déchiffrement** ; ce n'est pas du
  zero-knowledge pur. Les cas limitatifs d'accès (signalement, obligation légale,
  modération ciblée) sont documentés dans les CGU §9.1.
- GPS flouté côté client (`crypto.getRandomValues`) avant envoi.
- Distances arrondies (buckets anti-trilatération).
- Rate limiting par endpoint via `@upstash/ratelimit`.
- Validation clés publiques ECDH côté serveur.
- Whitelist champs modifiables (pas de mass assignment).
- Headers CSP, HSTS, X-Frame-Options, Permissions-Policy.
- Age gate 18+ à l'inscription via `birthDate` (validation côté client et serveur).

## Base de données

- Prisma 7 avec adapter natif PostgreSQL (`@prisma/adapter-pg`).
- Client généré dans `src/generated/` (git-ignoré).
- Migration automatique en production : `prisma migrate deploy`.

## Tests

```bash
npx vitest run       # unitaires / intégration
npx playwright test  # E2E navigateur
```

## Conventions de commit et PR

- Français, préfixe `feat(#NN)`, `fix(#NN)`, `docs(rex)`.
- Corriger `Closes #N` dans le corps de la PR.
- Toujours merger via review opérateur, sauf hotfix autorisé.
