# Clé maître de l'escrow (`CHAT_ESCROW_KEY`)

> Procédure d'exploitation — épic #197, lot A (#198).
> Spec : [`specs/002-messagerie-durable/`](../specs/002-messagerie-durable/spec.md)

## Ce qu'elle protège, et ce que sa perte coûte

Chaque compte possède une clé privée d'identité qui déchiffre ses conversations.
Elle est conservée côté serveur **scellée** par cette clé maître
(AES-256-GCM, `src/lib/crypto-escrow.ts`).

**Perdre `CHAT_ESCROW_KEY`, c'est rendre irrécupérables tous les messages de tous
les comptes.** Il n'existe aucun recours : ni sauvegarde de base, ni support, ni
reconstruction. Une variable d'environnement effacée par mégarde suffit.

À l'inverse, la divulguer donne accès au contenu des conversations de tout le
monde. Elle se traite comme une clé de coffre-fort, pas comme un paramètre.

## Génération

```sh
openssl rand -base64 32
```

32 octets, encodés en base64. Le module refuse toute autre longueur au lieu de
travailler avec une clé tronquée.

## Stockage

Une clé **par environnement**, jamais partagée :

| Environnement | Où | Remarque |
|---|---|---|
| Production | Variable Vercel, scope *Production* | La seule qui ouvre les données réelles |
| Preview | Variable Vercel, scope *Preview* | Une clé de preview ne doit jamais ouvrir la production |
| Développement | `.env` local (git-ignoré) | Sans valeur, régénérable à volonté |

Aucune de ces valeurs n'entre dans le dépôt. `.env.example` ne porte que le nom
de la variable et cet avertissement.

## Sauvegarde

**Une copie hors ligne de la clé de production**, gardée comme un secret de
récupération (gestionnaire de mots de passe personnel, support chiffré hors du
cloud du projet). C'est la seule protection contre la suppression accidentelle
de la variable Vercel.

Sans cette copie, la procédure de reprise n'existe pas.

## Absence de la clé

En développement, l'application doit **démarrer et le dire** : `escrowDisponible()`
renvoie `false`, et les routes de clé répondent explicitement plutôt que d'échouer
sur un `undefined` à la première conversation. En production, l'absence de la
variable est une panne à traiter comme telle — surtout pas un cas à contourner en
régénérant des paires côté client, ce qui détruirait les historiques.

## Rotation

Le format d'enveloppe est versionné (`v1:iv:chiffré:tag`), et c'est ce qui rend la
rotation possible sans transaction géante :

1. Introduire la nouvelle clé maître à côté de l'ancienne (`v2`).
2. Ouvrir avec l'ancienne, resceller avec la nouvelle, **compte par compte** —
   les blobs `v1` restent lisibles pendant toute la transition.
3. Une fois l'ensemble des lignes en `v2`, retirer l'ancienne clé.

Ne jamais ré-envelopper d'un bloc dans une seule transaction : une interruption
en cours de route laisserait des comptes dont personne ne peut plus ouvrir le
coffre.

## Ce que cette clé implique côté produit

L'escrow retire le zéro-knowledge : le service **peut** techniquement déchiffrer
les messages. Cet arbitrage est assumé (#198, décision du 2026-07-08) et doit
rester dit honnêtement dans la page Confidentialité et les CGU (#337). Une
promesse d'interface qui prétendrait le contraire serait un défaut de sécurité,
pas une maladresse de copie (principe III de la constitution, corollaire #328).
