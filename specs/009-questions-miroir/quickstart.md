# Quickstart — valider 009 Questions de profil en miroir

## Prérequis

PostgreSQL local + comptes de démo + `next dev` sur un port dédié + chromium
en cache (mémoire « Tester la livraison en local »). Jamais Neon.

- **A** : réponses à `fait-rire` et `chanson`.
- **B** : réponse à `fait-rire` seulement.

## Scénarios

1. **Répondre (US1)** — en B, profil → ajouter `dimanche-ideal` ; une réponse
   avec « écris-moi sur insta @b » est refusée avec le message de la règle.
2. **Lire (US2)** — en B, fiche de A : `fait-rire` lisible ; `chanson` voilée
   (onglet réseau : pas de texte), invitation « Réponds aussi pour lire la
   sienne ».
3. **Saisie en place (US2/FR-008)** — en B, répondre à `chanson` dans la
   fiche → la réponse de A apparaît sans quitter la fiche.
4. **Limite** — B avec 5 réponses : la saisie en place propose d'en remplacer
   une ; après remplacement, toujours 5.
5. **Retirer** — B retire sa réponse à `chanson` → celle de A redevient voilée.
6. **Modération (US3)** — A signale B ; en admin, les réponses de B figurent
   dans le signalement ; « Retirer » → disparue de la fiche, `ModerationLog`
   écrit, B voit la mention sobre.
7. **Export / suppression** — l'export de B contient ses réponses ;
   supprimer B supprime ses réponses.

## Gates

```bash
npx vitest run      # dont answers-never-leak.test.ts
npm run lint
npx next build      # base locale
```

E2E pixels : fiche (visible / voilée / saisie en place), section profil,
clair/sombre, 390/1080 ; plusieurs points par élément.
