# Quickstart — valider la spec 006

Base locale jetable, R2 désactivé, photos simulées : recette
`getlibre-test-livraison-local` (mémoire projet). Rien n'est écrit dans Neon ni
dans le bucket.

## Scénarios

1. **Le cas du 2026-09-24 (SC-001)** — ajouter à un compte une photo portant
   « Telegram : @lola_privee75 » en surimpression. → Dans la minute, le compte
   est dans `/admin/profils` avec « Contact externe sur une photo » et l'extrait.
2. **Bio refusée (FR-020)** — enregistrer la bio « écris-moi t . m e / lola ».
   → 400 avec la règle ; le profil entre en file avec « Contact externe dans la
   bio ». La bio « je n'ai pas Telegram » s'enregistre (signal faible seul, hors
   file).
3. **Photo recyclée (SC-003)** — bannir le compte du scénario 1 depuis la file,
   puis ajouter à un autre compte la même photo recompressée et recadrée de
   10 %. → Le second compte entre en file avec « Photo d'un compte banni ».
4. **Recherche inversée (US1)** — sur une fiche, « Google Lens » → nouvel
   onglet vers `lens.google.com/uploadbyurl?url=…` ; `/admin/logs` montre
   `SEARCH_PHOTO`.
5. **Mise en retrait (FR-018b)** — « Demander une vérification » → le profil
   disparaît de Découvrir pour un autre compte ; envoyer un message renvoie 403 ;
   le membre voit l'invitation. Approuver son badge → il réapparaît.
6. **Non-fuite (SC-006)** — le test `signaux-never-leak` passe ; aucune
   réponse membre ne contient `signal`, `retraitAt` (sauf pour soi-même) ni
   `profile_signals`.

## Gates

```sh
npx vitest run
npm run lint
npx tsc --noEmit -p .
```

Puis captures Playwright de `/admin/profils` et de l'invitation en retrait,
clair et sombre (prototype validé d'abord).
