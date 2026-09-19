# Data model — 004 ville manuelle

## Profile (existant) — champs ajoutés

| Champ | Colonne | Type | Défaut | Visibilité |
|---|---|---|---|---|
| `positionSource` | `position_source` | `String?` — `'device'` \| `'city'` | `null` (= aucune position) | la membre seule |
| `cityLabel` | `city_label` | `String?` (≤ 80) | `null` | la membre seule |

Champs existants réutilisés tels quels : `lastKnownLat`, `lastKnownLng`
(arrondis à 2 décimales), `lastGeolocAt`.

Migration `20260920120000_profile_city_fallback` :

```sql
ALTER TABLE "profiles" ADD COLUMN "position_source" TEXT;
ALTER TABLE "profiles" ADD COLUMN "city_label" TEXT;
```

Additive, nullable, sans backfill : un profil avec une position mais sans
source est lu comme `'device'` (seule source possible avant la feature) ; un
profil à `(0, 0)` est lu comme « aucune position ».

## Invariants

- `positionSource = 'city'` ⇒ `cityLabel` non nul et `(lastKnownLat, lastKnownLng) ≠ (0, 0)`.
- `positionSource = 'device'` ⇒ `cityLabel = null`.
- `positionSource = null` ⇒ `cityLabel = null` (et la position est `(0, 0)` ou héritée d'avant la feature).
- `cityLabel` et `positionSource` ne sont jamais sélectionnés dans une requête
  qui alimente une réponse lue par un autre membre.

## Transitions de source (« la dernière source qui parle »)

| Depuis | Événement | Vers | Écritures |
|---|---|---|---|
| aucune / device / city | `PUT /api/users/profile { city: {…} }` | city | lat/lng arrondis, `lastGeolocAt=now`, `positionSource='city'`, `cityLabel` |
| city / device | `PUT /api/users/profile { city: null }` | aucune | lat/lng = 0, `lastGeolocAt=null`, `positionSource=null`, `cityLabel=null` |
| aucune / city / device | `POST /api/geoloc/update` (non throttlé, non invisible) | device | lat/lng arrondis, `lastGeolocAt=now`, `positionSource='device'`, `cityLabel=null` |
| city | `POST /api/geoloc/update` throttlé ou invisible | city (inchangé) | aucune |

Le retrait (`city: null`) n'a pas de délai d'attente ; la saisie d'une ville non
plus (FR-006).

## Entité transitoire — CityCandidate

```ts
type CityCandidate = {
  label: string;      // « Lyon »
  qualifier: string;  // « 69, Rhône » (France) | « Bruxelles-Capitale » (monde) | ''
  country: string;    // « France », « Belgique »…
  lat: number;        // brut du service ; arrondi à l'écriture seulement
  lng: number;
};
```

Jamais stockée. Le libellé persisté est dérivé : `« Lyon (69) »` pour la
France, `« Bruxelles, Belgique »` ailleurs.
