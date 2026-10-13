# Quickstart — valider la spec 011

Toujours sur la base PostgreSQL **locale** avec données factices (règle
« données de membres hors IA ») — jamais sur Neon.

## Préalables

- Worktree sous `/home/w/projects/.worktrees/getlibre/<branche>/`,
  `node_modules` en `cp -al`, `.env` local, `npx prisma generate`.
- Base locale migrée, seed factice qui crée au moins :
  - un compte non vérifié et un compte vérifié avec le même `deviceId`
    (doublon probable) ;
  - deux comptes partageant une photo (grappe photo) ;
  - trois comptes inscrits depuis la même IP factice (grappe connexion) ;
  - un compte vérifié `lastSeenAt` à J-100, un à J-340, un à J-370 avec
    préavis à J-31 ;
  - un compte non vérifié créé à J-31.

## Gates

```sh
npx vitest run            # logique (grappes, gestes, purge, suggestion, hook d'adresse)
npx tsc --noEmit
npx eslint
```

## Scénarios

1. **Présence (US1)** : se connecter avec un compte factice, naviguer deux
   fois. `last_seen_at` vaut aujourd'hui, une seule écriture (compter les
   `UPDATE` dans le journal SQL local). Les stats admin le comptent dans
   « actifs 7 j ».
2. **Indices (US2)** : `/admin/indices` montre les trois grappes ; la
   première est filtrable en « doublon probable ». Supprimer l'orphelin : la
   grappe disparaît, une ligne `DELETE_DUPLICATE` dans le journal.
3. **Lot (US3)** : cocher cinq comptes dont un vérifié et un déjà invité,
   « inviter » : bilan 3 traités / 2 ignorés. « Exiger » sur deux comptes de
   grappes différentes non douteux : geste non proposé ; forcé par appel
   direct : 403.
4. **Navigation (US4)** : `/admin/profils` → `/admin/indices`. Sur
   `/admin/users`, filtrer « à surveiller », trier, page 2, ouvrir une fiche,
   revenir : même état ; recharger : même état.
5. **Inscription (US5)** : saisir `x@gmial.com` → suggestion `gmail.com` ;
   deux saisies différentes → envoi impossible. Après inscription, corriger
   l'adresse avec le mot de passe : le premier lien (journal d'e-mail local)
   mène à `invalid-token`, le second vérifie.
6. **Cycle de vie (US6)** : déclencher la purge depuis `/admin/retention`.
   Bilan : compte J-31 non vérifié supprimé ; J-340 reçoit un préavis ;
   J-370 avec préavis ancien supprimé. Le compte J-100 n'apparaît plus dans
   Découvrir, puis y réapparaît après une connexion.
7. **Politique** : `/confidentialite` liste les deux nouvelles durées.

## Gate visuel (principe V)

- Prototype de `/admin/indices` (grappes, comparaison, lot) validé par
  l'opérateur **avant** le code de US2/US3.
- Captures Playwright (chromium en cache, `executablePath`) de
  `/admin/indices`, `/register` et de l'écran d'attente, en clair et sombre,
  à 390 px et 1280 px ; mesures sur plusieurs points des éléments.
