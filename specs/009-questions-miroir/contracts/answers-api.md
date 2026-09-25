# Contrat — réponses aux questions

## `GET /api/users/me/answers`

```json
{ "answers": [ { "key": "dimanche-ideal", "label": "Un dimanche idéal…", "text": "…", "status": "published" } ],
  "questions": [ { "key": "…", "label": "…" } ], "max": 5 }
```

`questions` = banque proposée (hors `retired`).

## `PUT /api/users/me/answers`

Corps : `{ "key": "fait-rire", "text": "…", "replaces"?: "chanson" }` — crée ou
modifie la réponse à `key` ; `replaces` retire une autre réponse dans la même
transaction (cas « déjà 5 »).

| Cas | Statut | Corps |
|---|---|---|
| OK | 200 | la réponse enregistrée |
| clé inconnue ou retirée | 400 | `{ error }` |
| texte hors règle (vide, > 300, contact, invisible) | 400 | `{ error, motif }` |
| 6ᵉ réponse sans `replaces` | 409 | `{ error: 'max', max: 5 }` |
| débit | 429 | |

Champs ignorés : tout sauf `key`, `text`, `replaces`.

## `DELETE /api/users/me/answers?key=…`

204 ; idempotent.

## `GET /api/users/[id]` (ajout)

```json
{ "answers": [
  { "key": "fait-rire", "label": "Qu'est-ce qui te fait rire à coup sûr ?", "text": "…" },
  { "key": "chanson", "label": "Une chanson…", "veiled": true }
] }
```

Voilée : **pas de clé `text`**. Absente si la personne n'a aucune réponse
publiée. Sur sa propre fiche, tout est visible.

## `PATCH /api/admin/answers/[id]` (admin)

Corps : `{ "status": "removed" }`. Journal `ModerationLog`
(`REMOVE_ANSWER`, `reason` = clé). 403 hors admin.

## Garde `answers-never-leak`

Lectrice sans réponse à Q → le JSON de la fiche ne contient pas le texte
(sentinelle) de la réponse à Q, et porte `"veiled":true` ; avec réponse →
présent ; lectrice introuvable → voilé ; réponse `removed` → jamais envoyée
à autrui.
