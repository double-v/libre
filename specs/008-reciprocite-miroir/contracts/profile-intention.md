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

- `relationshipTypeVeiled` → sous le nom : une barre muette (`bg-fill-subtle`,
  décorative, `aria-hidden`), la phrase « Dis ce que tu cherches pour lire ce
  que cherchent les autres. » et le lien `Préciser` (ghost, ≥ 44 px) vers
  `/profile#profile-section-seeking`. Copie **validée au prototype le
  2026-09-25**.
- Filtres, groupe « Type de relation » inactif : « Dis ce que tu cherches pour
  filtrer sur ce critère. » + `Préciser`.
- `relationshipType: []` → rien (comme aujourd'hui).
