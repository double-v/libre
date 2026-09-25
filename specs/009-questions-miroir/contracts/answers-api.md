# Contrat — réponses aux questions

## `GET /api/users/me/answers`

```json
{ "answers": [ { "key": "cafe-the", "label": "Café, thé…", "format": "choix", "choice": "the", "text": "vert, sans sucre", "status": "published" } ],
  "questions": [ { "key": "…", "theme": "…", "format": "choix", "label": "…", "hint": "…", "options": [ { "key": "the", "label": "Thé" } ] } ] }
```

`questions` = banque proposée (hors `retired`).

## `PUT /api/users/me/answers`

Corps : `{ "key": "cafe-the", "choice"?: "the", "text"?: "…" }` — crée ou
modifie la réponse à `key`. Format respecté (FR-002b) : choix requis pour
`choix` / `ceci-ou-cela`, texte requis pour `ouverte`.

| Cas | Statut | Corps |
|---|---|---|
| OK | 200 | la réponse enregistrée |
| clé inconnue ou retirée | 400 | `{ error }` |
| texte hors règle (vide si requis, > 300, contact, invisible) | 400 | `{ error, motif }` |
| choix absent, inconnu, ou fourni à une question ouverte | 400 | `{ error }` |
| débit | 429 | |

Champs ignorés : tout sauf `key`, `choice`, `text`.

## `DELETE /api/users/me/answers?key=…`

204 ; idempotent.

## `GET /api/users/[id]` (ajout)

```json
{ "answers": [
  { "key": "fait-rire", "label": "Qu'est-ce qui te fait rire à coup sûr ?", "format": "ouverte", "text": "…" },
  { "key": "mer-montagne", "label": "Mer ou montagne", "format": "ceci-ou-cela", "choice": "mer" },
  { "key": "chanson", "label": "Une chanson…", "format": "ouverte", "veiled": true }
] }
```

Voilée : **ni `text` ni `choice`**. Ordre : en commun d'abord (R4). Absente si la personne n'a aucune réponse
publiée. Sur sa propre fiche, tout est visible.

## `PATCH /api/admin/answers/[id]` (admin)

Corps : `{ "status": "removed" }`. Journal `ModerationLog`
(`REMOVE_ANSWER`, `reason` = clé). 403 hors admin.

## Garde `answers-never-leak`

Lectrice sans réponse à Q → le JSON de la fiche ne contient pas le texte
(sentinelle) de la réponse à Q, et porte `"veiled":true` ; avec réponse →
présent ; lectrice introuvable → voilé ; réponse `removed` → jamais envoyée
à autrui.
