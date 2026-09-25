# Contrat — intention dans les réponses lues par autrui

S'applique à : `GET /api/users/[id]`, `GET /api/geoloc/nearby`,
`GET /api/geoloc/crossings`, et à toute route future qui sérialise
l'intention d'une autre personne.

## Forme

Visible :

```json
{ "relationshipType": ["sérieux"] }
```

Non renseignée chez la personne lue :

```json
{ "relationshipType": [] }
```

Voilée pour la lectrice :

```json
{ "relationshipTypeVeiled": true }
```

La clé `relationshipType` est **absente** (pas `null`, pas `[]`) dans le cas
voilé. `relationshipTypeVeiled` n'apparaît jamais à `false`.

## Invariants testés (garde `intention-never-leaks`)

1. Lectrice sans intention, personne lue avec intention → aucune valeur de
   `RELATIONSHIP_TYPE_OPTIONS` dans le JSON sérialisé de la personne lue, et
   `relationshipTypeVeiled === true`.
2. Lectrice avec intention (dont `je verrai en chemin`) → valeur présente.
3. Lectrice = personne lue → valeur présente.
4. Profil lectrice introuvable → voilé.

## Côté interface

- `relationshipTypeVeiled` → ligne d'invitation : « Dis ce que tu cherches
  pour lire ce que cherchent les autres » + lien `Préciser` vers
  `/profile#profile-section-seeking`. Copie définitive fixée au prototype.
- `relationshipType: []` → rien (comme aujourd'hui).
