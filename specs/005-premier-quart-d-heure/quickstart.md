# Quickstart — valider « le premier quart d'heure »

Guide de validation, pas d'implémentation. Les détails sont dans
[data-model.md](./data-model.md) et [contracts/](./contracts/).

## Prérequis

- Worktree sous `/home/w/projects/.worktrees/getlibre/…`, `.env` copié,
  `node_modules` en liens durs (`cp -al`), `npx prisma generate`.
- PostgreSQL local (`libre_local_<ticket>`) cloné d'une base précédente,
  migrations appliquées avec `DATABASE_URL` local — jamais Neon.
- Chromium Playwright en cache (`~/.cache/ms-playwright/chromium-1234`).

## Gates locaux (constitution)

```sh
npx vitest run                 # dont les 4 nouveaux fichiers de tests
npx tsc --noEmit
npx eslint <fichiers touchés>
```

## Scénarios à rejouer sur l'app servie

### S1 — Exister dès l'inscription (US1)

1. Sur la base locale, créer un compte via `/register`, vérifier l'e-mail (ou forcer `emailVerified` en SQL), se connecter.
2. Avec un second compte, ouvrir `/discover` : le premier apparaît, sans photo, en bas du feed.
3. En SQL : `SELECT count(*) FROM users u LEFT JOIN profiles p ON p."userId"=u.id WHERE p."userId" IS NULL` → `0`.

### S2 — Parcours complet (US2)

1. Nouveau compte → première connexion → arrivée sur `/bienvenue` (pas `/discover`).
2. Étape photo : ajouter une image → étape suivante ; `profiles.photos` non vide.
3. Étape « ce que tu cherches » : choisir « libre » → `relationshipType` **et** `searchRelationshipTypes` valent `['libre']`.
4. Étape « où » : refuser la géoloc (contexte Playwright sans permission) → saisir une ville → `position_source = 'city'`.
5. Proposition push (chromium supporte) → « Plus tard » → arrivée sur `/discover`, `onboardingStep = 3`, `localStorage['libre:push-asked']` posé.
6. Recharger `/discover` : pas de retour vers `/bienvenue`.

### S3 — Tout passer (US2, SC-009)

Nouveau compte, « Plus tard » × 3 puis « Plus tard » sur push → `/discover`, profil vide, `onboardingStep = 3`, aucune erreur console (hors avertissements préexistants CSP/Pusher).

### S4 — Reprise (FR-010)

Nouveau compte, ajouter une photo, fermer l'onglet. Rouvrir `/discover` → redirigé sur `/bienvenue` à l'étape « ce que tu cherches ».

### S5 — Push accepté (US3)

Nouveau compte, dérouler, accepter le push (contexte Playwright avec permission `notifications`) → une ligne dans `push_subscriptions` ; `/settings` affiche l'appareil abonné.

### S6 — Relance (US4)

1. Compte existant sans photo (`onboardingStep = 3` par migration) → `/discover` : carte « Ajoute une photo » en première cellule, avant les profils.
2. « Plus tard » → carte absente ; `localStorage['libre:nudge-dismissed']` posé ; avancer la date de 8 jours (modifier la valeur) → carte de retour.
3. Ajouter une photo → carte suivante (« Dis ce que tu cherches ») ; renseigner → carte « Indique où tu es » ; renseigner → plus de carte.
4. Lire le texte de la carte : aucun chiffre, aucune mention d'autres membres.

### S7 — Ordre du feed (FR-022)

Base locale avec 3 profils avec photo et 3 sans, activités mélangées → `/api/discover?tab=all` : les 3 avec photo d'abord ; puis avec `distance=50` : même ordre ; paginer avec `nextCursor` (mettre `PAGE_SIZE` en tête si besoin de forcer 2 pages en test unitaire) : aucun doublon, aucun oubli.

### S8 — Non-fuite

`npx vitest run src/__tests__/onboarding-step-never-leaks.test.ts` ; et à la main : `GET /api/users/<autre-id>` ne contient pas `onboardingStep`.

## Gate visuel (principe V)

1. **Avant code** : prototype validé le 2026-09-20 — `http://192.168.1.116:8101/getlibre/feat-005-premier-quart-d-heure/bienvenue.html`. L'implémentation le reproduit, sans réinterprétation.
2. **Avant merge** : captures Playwright 420×900 (mobile, sombre et clair) et 1280×800 de chaque étape et de la grille avec carte ; échantillonner plusieurs points (pas de recouvrement par le bandeau cookies ni la tab bar).

## Mesure (SC-001…SC-007)

`GET /api/admin/stats` expose les agrégats ajoutés (research R10). Relever
la baseline le jour du déploiement, puis à J+21.
