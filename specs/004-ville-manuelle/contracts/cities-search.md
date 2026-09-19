# Contract — GET /api/geoloc/cities

Propositions de villes pour la saisie manuelle. Membre connectée uniquement.

## Requête

`GET /api/geoloc/cities?q=<texte>`

- `q` : 3 à 80 caractères après `trim`. En dessous de 3 → `200 { cities: [] }`
  (pas d'erreur, pas d'appel sortant).
- Rate limit `cities` : 30 requêtes / minute / membre → `429 { error: 'rate_limited' }`.

## Réponse

```json
{
  "cities": [
    { "label": "Saint-Denis", "qualifier": "93, Seine-Saint-Denis", "country": "France", "lat": 48.937483, "lng": 2.361503 },
    { "label": "Saint-Denis", "qualifier": "974, La Réunion", "country": "France", "lat": -20.909778, "lng": 55.444588 },
    { "label": "Saint-Denis", "qualifier": "Québec", "country": "Canada", "lat": 46.06, "lng": -71.13 }
  ]
}
```

- 5 propositions maximum ; France d'abord, puis le reste du monde.
- Deux propositions n'ont jamais le même triplet `(label, qualifier, country)`.
- Aucun autre champ (pas de code postal, pas d'adresse, pas d'identifiant du
  service amont).

## Erreurs

| Cas | Statut | Corps |
|---|---|---|
| non connectée | 401 | `{ error: 'Unauthorized' }` |
| `q` > 80 caractères | 400 | `{ error: 'Validation failed' }` |
| les deux services amont en échec / timeout (4 s) | 503 | `{ error: 'geocoding_unavailable' }` |
| un seul service en échec | 200 | propositions du service restant |

## Amont (détail d'implémentation, non exposé)

- France : `https://data.geopf.fr/geocodage/search?q=&index=address&type=municipality&limit=5`
- Monde : `https://photon.komoot.io/api/?q=&lang=fr&limit=5&osm_tag=place:city&osm_tag=place:town&osm_tag=place:village`
- `fetch(..., { next: { revalidate: 86400 } })` — cache partagé 24 h par URL.
