# Quickstart — valider la spec 013

Données factices seulement. Jamais Neon, jamais la production. Ne pas
copier `.env` dans le worktree.

## 1. Tests

```sh
npx tsc --noEmit
npm run lint
npm run test:db          # unitaire + PostgreSQL jetable (migration, remplissage, courses)
```

Ce qui doit être vert, en plus de l'existant :
- `src/lib/connexion/__tests__/` : pays, territoires, réseau (invariants de
  la table, témoins), `observerConnexion` (effets en base factice, journaux
  sans adresse) ;
- `src/lib/__tests__/photo-ia.test.ts` : corpus forgé (générée, retouchée,
  appareil, piégés) ;
- `tests/integration/indices-013.test.ts` : migration, remplissage des
  boîtes, unicité sous course, plafond de 8 pays ;
- la garde `city-label-never-leaks` avec les deux nouveaux champs.

## 2. Bout en bout sur une base jetable

1. PostgreSQL jetable (`postgres:17`, port libre), `prisma migrate deploy`,
   puis `prisma/seed-bureau-012.sql` et un compte admin factice.
2. `npx next dev -p 3100`, avec `DATABASE_URL`, `NEXTAUTH_URL` et
   `NEXTAUTH_SECRET` en variables d'environnement.
3. Scénarios, joués avec `curl` en posant les en-têtes que Vercel
   ajouterait (seulement en local) :
   - inscription avec `x-vercel-ip-country: CI` et une ville à Lyon. La
     fiche admin montre « Connexion depuis un autre pays que celui de sa
     ville (Côte d'Ivoire) » ;
   - connexion avec `x-forwarded-for` égal à une adresse témoin
     d'hébergeur. La fiche montre « … réseau d'hébergement » ;
   - connexion avec une adresse témoin du relais Apple : aucun indice ;
   - `x-vercel-ip-country: RE` avec une ville à Saint-Denis de La Réunion,
     puis avec une ville à Lyon : aucun indice ;
   - téléversement d'une photo forgée `trainedAlgorithmicMedia`. La photo
     s'affiche sur le profil, la fiche montre « Photo déclarée générée par
     IA », et le compte passe « douteux » dans le hub trié par fiabilité ;
   - la photo stockée dans R2 (ou le stockage local de test) n'a plus aucune
     métadonnée.
4. Captures Playwright (`executablePath` =
   `~/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`) de la
   fiche, à 360 px en clair et 1280 px en sombre. Aucun débordement
   horizontal ; le libellé avec le pays et la mention légitime tiennent sans
   ouvrir d'autre page (SC-004).
5. Ranger : le conteneur, le serveur, les scripts temporaires, et
   `git checkout AGENTS.md`.

## 3. Au déploiement de prévisualisation (une fois)

Une requête vers la prévisualisation avec un en-tête forgé
`x-vercel-ip-country: ZZ` : un point de diagnostic **temporaire et réservé
à l'admin** renvoie le pays vu par la fonction. Il doit valoir le vrai pays,
pas `ZZ`. On retire ce point avant `ready`. Si Vercel laissait passer la
valeur forgée, on le consigne dans la PR : la parade M2 reste valable
(seule conséquence, l'évitement de l'indice).

## 4. Après un mois (SC-005)

L'opérateur lance `scripts/agregats/indices-013.ts` contre la production.
Le script n'imprime que des nombres, et les cases inférieures à 5
s'affichent « < 5 ».
