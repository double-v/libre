# Quickstart — valider 008 Réciprocité miroir

## Prérequis

Environnement local de test décrit dans la mémoire « Tester la livraison en
local » : PostgreSQL local + seed, `npm run dev`, chromium en cache. Ne jamais
viser Neon.

Deux comptes seedés :
- **A** : sans intention, sans position.
- **B** : intention `sérieux`, position renseignée.

## Scénarios

1. **Voile fiche (US1)** — connecté·e en A, ouvrir la fiche de B.
   Attendu : pas de « sérieux », invitation visible ; dans l'onglet réseau, la
   réponse de `/api/users/<B>` n'a pas `relationshipType` et a
   `relationshipTypeVeiled: true`.
2. **Rien à dévoiler (US1-4)** — vider l'intention de B, rouvrir la fiche en A.
   Attendu : ni intention, ni invitation.
3. **Filtre neutralisé (US1-5)** — en A, ouvrir les filtres : groupe
   « Type de relation » inactif avec invitation. Appeler
   `/api/discover?relationshipType=sérieux` : même résultat que sans le
   paramètre.
4. **Lever le voile avec « je verrai en chemin » (US2)** — en A, suivre
   l'invitation, choisir « je verrai en chemin », revenir.
   Attendu : l'intention de B est lisible ; en B, la fiche de A affiche
   « je verrai en chemin ».
5. **Invitation distance (US3)** — en A (sans position), onglet « Pour toi » :
   une seule ligne d'invitation, aucune par carte ; si la carte de relance
   affiche déjà la position, pas de ligne. Saisir une ville → les tranches de
   distance apparaissent, l'invitation disparaît.
6. **Rien de bloqué (FR-012)** — en A : liker, matcher, écrire à B fonctionnent.

## Gates

```bash
npx vitest run                       # dont intention-never-leaks.test.ts
npm run lint
npx playwright test                  # gate pixels : invitations clair/sombre, mobile/desktop
```

Échantillonner plusieurs points de chaque invitation (pas seulement le centre)
pour vérifier qu'aucun élément ne la recouvre.
