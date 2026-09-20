# Quickstart — valider 004 ville manuelle en local

La CI GitHub n'a pas de quota : tout se valide ici avant `gh pr ready`.

## Prérequis

- Worktree `/home/w/projects/.worktrees/getlibre/feat-402-ville-manuelle`
  avec `node_modules` (cp -al), `.env`, `npx prisma generate`.
- **Ne pas** lancer `prisma migrate dev` ni `npm run build` (Neon partagée).
  La migration est additive et s'applique par Vercel ; pour voir des pixels avec
  la colonne, utiliser le PostgreSQL local (mémoire « tester la livraison en
  local ») : `psql <local> -f prisma/migrations/20260920120000_profile_city_fallback/migration.sql`.

## Gates logiques

```sh
npx vitest run                      # dont geocoding.test.ts, profile-city.test.ts, city-label-never-leaks.test.ts
npx tsc --noEmit
npx eslint .
```

Attendu : 0 échec, 0 erreur.

## Scénarios à rejouer (sur l'app servie en local, DB locale)

1. **US1 — profil** : compte sans position → Profil → « Ta ville » → taper
   « saint-den » → 3 propositions qualifiées (93 / 974 / 11) → choisir → la
   carte affiche « Ta ville : Saint-Denis (93) » ; Découvrir → « À proximité »
   liste des profils avec distances.
2. **US2 — Découvrir** : sur `/discover`, forcer un échec géoloc (Chromium :
   `--deny-permission-prompts`, ou DevTools Sensors → « Location unavailable ») →
   le message d'erreur est suivi de « Ou indique ta ville » → choisir → feed
   rechargé avec distances.
3. **US3 — transitions** : remplacer la ville (immédiat), la retirer (« Aucune
   position », Découvrir re-propose géoloc/ville), activer la géoloc (Sensors →
   Paris) → « Position de ton appareil », plus de nom de ville.
4. **Non-fuite** : en tant qu'un autre compte, `GET /api/users/<id>` et
   `/api/discover` ne contiennent pas « Saint-Denis » ; le test
   `city-label-never-leaks` couvre la même chose hors navigateur.

## Gate visuel (principe V)

- Prototype `CityPicker` + carte position sur proto-server, validé par
  l'opérateur **avant** le composant.
- Captures Playwright (chromium en cache, `executablePath`) de `/profile` et
  `/discover` en 390 px et 1080 px, clair et sombre, échantillonnées en
  plusieurs points ; jointes à la PR.
