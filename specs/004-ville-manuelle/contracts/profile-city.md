# Contract — PUT / GET /api/users/profile (extension ville)

## PUT — définir ou retirer sa ville

Champ ajouté à `profileUpdateSchema` (whitelist zod, cf. anti mass-assignment) :

```ts
city?: { label: string; qualifier: string; country: string; lat: number; lng: number } | null
```

- Objet : la route écrit `lastKnownLat/Lng = round2(lat/lng)`, `lastGeolocAt = now()`,
  `positionSource = 'city'`, `cityLabel = formatCityLabel(city)` (`« Lyon (69) »` /
  `« Bruxelles, Belgique »`, ≤ 80 caractères).
- `null` : la route écrit `lastKnownLat/Lng = 0`, `lastGeolocAt = null`,
  `positionSource = null`, `cityLabel = null`.
- Absent : aucun de ces champs n'est touché (les autres mises à jour du profil
  ne peuvent pas effacer une ville par accident).
- Validation : `label` 1–80, `qualifier` 0–80, `country` 1–60, `lat ∈ [-90, 90]`,
  `lng ∈ [-180, 180]`. Hors bornes → `400`.
- Ni throttle de 10 min, ni brouillage (#401) : ce n'est pas une position d'appareil.

Le client ne peut envoyer que des coordonnées : la route ne re-géocode pas. Le
risque de coordonnées arbitraires est le même qu'avec `/api/geoloc/update`
(un client peut déjà y envoyer ce qu'il veut) et l'arrondi à 2 décimales le
borne.

## GET — lecture privée (soi-même)

La réponse `{ profile }` existante porte désormais `positionSource` et
`cityLabel`. Elle n'est lue que par la membre elle-même (session).

## Autres routes — garantie de non-fuite

`GET /api/users/[id]`, `GET /api/discover`, `GET /api/geoloc/nearby`,
`GET /api/geoloc/crossings`, `GET /api/matches`, charges utiles push
(`buildPayload`) : **jamais** `cityLabel` ni `positionSource`. Test de
non-régression `src/__tests__/city-label-never-leaks.test.ts` avec la
sentinelle `cityLabel = 'SENTINELLE-VILLE'`.

`GET /api/users/me/export` (export RGPD de ses propres données) : inclut les
deux champs, c'est à la membre.

## POST /api/geoloc/update — écriture de la source

Ajoute `positionSource: 'device', cityLabel: null` à l'`upsert` existant. Rien
d'autre ne change (throttle, invisible, croisements).
