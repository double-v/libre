# Contrat — réponses aux questions

## `GET /api/users/me/answers`

```json
{ "answers": [ { "key": "cafe-the", "label": "Café, thé…", "format": "choix", "multiple": true, "choices": ["the", "tisane"], "text": "vert, sans sucre", "status": "published" } ],
  "questions": [ { "key": "…", "theme": "…", "format": "choix", "multiple": true, "label": "…", "hint": "…", "options": [ { "key": "the", "label": "Thé" }, { "key": "aucun", "label": "Aucun des quatre", "exclusive": true } ] } ] }
```

`questions` = banque proposée (hors `retired`).

## `PUT /api/users/me/answers`

Corps : `{ "key": "cafe-the", "choices"?: ["the", "tisane"], "text"?: "…" }` — crée ou
modifie la réponse à `key`. Format respecté (FR-002b) : choix requis pour
`choix` / `ceci-ou-cela` (un seul si choix unique ou ceci-ou-cela ; option exclusive seule), texte requis pour `ouverte`.

| Cas | Statut | Corps |
|---|---|---|
| OK | 200 | la réponse enregistrée |
| clé inconnue ou retirée | 400 | `{ error }` |
| texte hors règle (vide si requis, > 300, contact, invisible) | 400 | `{ error, motif }` |
| choix absent, inconnu, en double, plusieurs pour un choix unique, exclusive combinée, ou fourni à une question ouverte | 400 | `{ error }` |
| débit | 429 | |

Champs ignorés : tout sauf `key`, `choices`, `text`.

## `DELETE /api/users/me/answers?key=…`

204 ; idempotent.

## `GET /api/users/[id]` (ajout)

```json
{ "answers": [
  { "key": "fait-rire", "label": "Qu'est-ce qui te fait rire à coup sûr ?", "format": "ouverte", "text": "…" },
  { "key": "mer-montagne", "label": "Mer ou montagne", "format": "ceci-ou-cela", "choices": ["mer"] },
  { "key": "chanson", "label": "Une chanson…", "format": "ouverte", "veiled": true }
] }
```

Voilée : **ni `text` ni `choices`**. Ordre : en commun d'abord (R4). Absente si la personne n'a aucune réponse
publiée. Sur sa propre fiche, tout est visible.

## `PATCH /api/admin/answers/[id]` (admin)

Corps : `{ "status": "removed" }`. Journal `ModerationLog`
(`REMOVE_ANSWER`, `reason` = clé). 403 hors admin.

## Garde `answers-never-leak`

Lectrice sans réponse à Q → le JSON de la fiche ne contient pas le texte
(sentinelle) de la réponse à Q, et porte `"veiled":true` ; avec réponse →
présent ; lectrice introuvable → voilé ; réponse `removed` → jamais envoyée
à autrui.
