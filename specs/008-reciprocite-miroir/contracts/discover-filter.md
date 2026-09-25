# Contrat — Découvrir : filtre d'intention et invitation distance

## `GET /api/discover?relationshipType=a,b`

- Lectrice avec intention déclarée : comportement actuel (`hasSome`).
- Lectrice **sans** intention déclarée : le paramètre est **ignoré** ; la
  réponse est celle d'une requête sans filtre d'intention. Pas d'erreur, pas
  de marqueur (le client sait déjà que la lectrice n'a rien déclaré).
- Les cartes du feed ne portent pas l'intention (inchangé).

## `SearchFilters`

- Prop nouvelle : `intentionDeclared: boolean`.
- `false` → le groupe « Type de relation » est rendu non interactif, avec la
  même invitation que la fiche ; les choix déjà enregistrés ne sont pas
  effacés.
- `true` → inchangé ; `je verrai en chemin` y figure comme les autres valeurs.

## Invitation distance (page Découvrir, segment « Pour toi »)

Affichée **une fois** en tête du segment si et seulement si :

- la lectrice n'a ni position d'appareil ni ville (`deriveMissing` → règle
  position), **et**
- la carte de relance n'est pas en train d'afficher `position`.

Copie : « Partage où tu es pour voir les distances » + lien vers
`/profile#profile-section-position`. Jamais affichée sur « À proximité »
(état vide existant) ni sur une carte individuelle.
