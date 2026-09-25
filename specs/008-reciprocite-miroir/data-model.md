# Data Model — 008 Réciprocité miroir

Aucune table, aucune colonne, aucune migration.

## Intention (existant) — `Profile.relationshipType: String[]`

- Valeurs permises (taxonomie unique déclaration + filtre) :
  `libre`, `poly`, `casual`, `sérieux`, `autre`, **`je verrai en chemin`** (nouveau).
- **Déclarée** ⇔ la liste contient au moins une valeur. `je verrai en chemin`
  compte comme toute autre (FR-006).
- Validation inchangée : tableau ≤ 10 éléments, chaque élément ≤ 30 caractères.

## État de lecture de l'intention (dérivé, jamais stocké)

Pour un couple (lectrice L, personne lue P) :

| L est P | L déclarée | P déclarée | Résultat sérialisé |
|---|---|---|---|
| oui | — | — | `relationshipType: [...]` (FR-004) |
| non | oui | — | `relationshipType: [...]` (éventuellement `[]`) |
| non | non | non | `relationshipType: []` — rien à dévoiler, pas d'invitation |
| non | non | oui | clé omise + `relationshipTypeVeiled: true` |
| non | inconnue (profil L introuvable / erreur) | oui | voilé (fermé par défaut) |

Transition : L déclare une intention → à la lecture suivante, `visible`.
L vide son intention → `voilé` revient.

## Position (existant, spec 004)

Seul prédicat utilisé : `lectriceALocalisation = !!lastGeolocAt || !!cityLabel`
(même règle que `deriveMissing`). Lu côté client sur le profil de la lectrice,
qui est déjà chargé par la page Découvrir. Aucune donnée de position d'autrui
n'est ajoutée à une réponse.
