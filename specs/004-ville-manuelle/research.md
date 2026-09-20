# Research — 004 ville manuelle

## R1. Service de géocodage

**Decision**: IGN Géoplateforme (`https://data.geopf.fr/geocodage/search`,
`index=address&type=municipality`) pour la France, Photon
(`https://photon.komoot.io/api/`, `osm_tag=place:city|town|village`, `lang=fr`)
pour le reste du monde. Les deux sont interrogés en parallèle côté serveur ;
résultats France d'abord, Photon dédoublonné (on écarte `country = France`).

**Rationale**: aucune clé, gratuits, GeoJSON stable. Le service IGN est le
successeur officiel d'`api-adresse.data.gouv.fr` (même format, mêmes données
BAN) et fournit le département dans `properties.context` (« 93, Seine-Saint-Denis,
Île-de-France ») — exactement le qualificatif demandé par la spec pour lever les
homonymes (3 « Saint-Denis » vérifiés le 2026-09-20). Photon renvoie `country`
et `state` en français avec `lang=fr`.

**Alternatives considered**:
- Nominatim direct : politique d'usage à 1 req/s et User-Agent obligatoire,
  inadapté à une autocomplétion.
- Google/Mapbox : clé + facturation, et une donnée de position part chez un
  tiers commercial. Refusé (principe III).
- Une table de villes embarquée (communes INSEE) : couvre la France seule et
  alourdit le dépôt ; le repli mondial serait à réinventer.

## R2. Qualificatif et dédoublonnage

**Decision**: `CityCandidate = { label, qualifier, country, lat, lng }`. France :
`qualifier` = numéro + nom de département tirés de `context`. Monde : `qualifier`
= `state` (ou vide), `country`. Deux candidats sont identiques si même `label`
+ même `qualifier` + même `country` ; 5 propositions maximum.

**Rationale**: la spec exige qu'une homonymie soit toujours différenciée et que le
système ne choisisse jamais seul (SC-005). Le libellé stocké est
`« Lyon (69) »` / `« Bruxelles, Belgique »` — lisible par la membre, jamais par
les autres.

## R3. Cache et limite de débit

**Decision**: la route `GET /api/geoloc/cities` exige `q` ≥ 3 caractères,
normalise (`trim`, minuscules, accents conservés), applique un rate limit
`cities: 30 / min / membre` (nouvelle entrée dans `limits`), et appelle les deux
services via `fetch(url, { next: { revalidate: 86400 } })` pour mutualiser le
cache Next entre membres. Le client débounce à 300 ms.

**Rationale**: la spec demande une limite par membre (FR-010) et une dégradation
propre si le service ne répond pas (FR-009) : timeout 4 s par service,
`Promise.allSettled`, une seule source suffit pour répondre ; deux échecs → 503
avec message « Réessaie dans un instant ».

## R4. Précision stockée et cohabitation avec le throttle

**Decision**: `PUT /api/users/profile` avec `city` écrit `lastKnownLat/Lng =
round2(lat/lng du candidat)`, `lastGeolocAt = now()`, `positionSource = 'city'`,
`cityLabel = label`. Pas de brouillage (#401) ni de throttle de 10 min : la
route est indépendante de `/api/geoloc/update`. `/api/geoloc/update`, lui,
écrit `positionSource = 'device'` et `cityLabel = null` (dernière source qui
parle, clarification 2).

**Rationale**: la position d'un centre-ville n'a rien à protéger de plus qu'un
arrondi au kilomètre ; le throttle vise un appareil bavard, pas un choix
explicite. Le mode invisible est traité comme aujourd'hui : la ville est
enregistrée dans le profil, mais `/api/geoloc/update` continue de ne rien
écrire et Découvrir n'exploite pas la position tant que le mode est actif — la
carte position du profil l'indique.

**Alternatives considered**: réutiliser `/api/geoloc/update` avec un flag
`source` — refusé, ça mélangerait la charge utile brouillée de l'appareil et un
choix explicite dans une route déjà chargée (croisements).

## R5. Non-fuite du libellé

**Decision**: test `src/__tests__/city-label-never-leaks.test.ts` qui monte les
routes lues par autrui (`GET /api/users/[id]`, `GET /api/discover`,
`GET /api/geoloc/nearby`, `GET /api/geoloc/crossings`, `GET /api/matches`) avec
un `fakeDb` dont le profil porte `cityLabel = 'SENTINELLE'` et
`positionSource = 'city'`, et vérifie que la réponse sérialisée ne contient ni
l'un ni l'autre. Même méthode que #328.

**Rationale**: principe III, corollaire #328 — une promesse (« le nom de ta ville
n'est visible que par toi ») doit être adossée à un test par route.

## R6. Gate visuel

**Decision**: prototype HTML statique de `CityPicker` + carte position (profil
et invite Découvrir, mobile 390 px et desktop 1080 px, thème clair/sombre)
publié sur proto-server, validé par l'opérateur avant d'écrire le composant ;
puis captures Playwright de l'app servie en local (chromium en cache, cf.
mémoire Playwright/Ubuntu 26.04) avant `gh pr ready`.
