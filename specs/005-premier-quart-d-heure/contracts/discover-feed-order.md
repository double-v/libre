# Contrat — ordre de « Pour toi » (FR-022)

## `GET /api/discover?tab=all[&distance=…]`

Ordre des résultats, quelle que soit la pagination :

1. profils avec **au moins une photo**, par activité récente décroissante ;
2. puis profils **sans photo**, par activité récente décroissante ;
3. à égalité, `userId` croissant (stabilité du curseur).

Personne n'est masqué : un profil sans photo reste dans le feed, plus bas.
Les autres critères (`baseWhere`, filtres, distance) sont inchangés.

## Curseur

Les deux chemins de « Pour toi » (avec et sans filtre de distance) passent
par le tri mémoire et le curseur composite `(sortValue, userId)` déjà
utilisé pour la distance (#180). `sortValue = hasPhoto * 2^53 + lastActive`
— un nombre, donc `encodeCursor`/`decodeCursor` inchangés. Un curseur émis
avant cette version décode encore ; au pire il renvoie la page 1
(dégradation douce déjà prévue).

## Segments non concernés

`tab=online` (tri activité seule, curseur Prisma) et `tab=nearby` (tri
distance) gardent leur ordre. La spec ne parle que de « Pour toi ».

## Limite connue

Le chemin « Pour toi sans distance » charge désormais tous les candidats de
`baseWhere` avant de trier (comme « À proximité » le fait déjà). Au-delà de
quelques milliers de profils, remplacer par une colonne `hasPhoto`
maintenue par les routes photos et un `orderBy` Prisma. Noté dans le code,
pas dans cette version.

## Tests

`src/app/api/discover/__tests__/discover-photo-first.test.ts` :
- avec photo avant sans photo, malgré une activité plus ancienne ;
- à photo égale, activité récente d'abord ;
- la page 2 (curseur) ne contient aucun profil déjà servi en page 1 et
  respecte le même ordre ;
- un profil sans photo n'est jamais absent de l'ensemble des pages.
