# Data Model — 009 Questions de profil en miroir

## Question (code, `src/lib/questions.ts`)

| Champ | Type | Règle |
|---|---|---|
| `key` | string ASCII `[a-z-]+` | stable, unique, jamais réutilisée pour un autre sens |
| `label` | string | intitulé affiché, reformulable |
| `retired` | boolean? | retirée : plus proposée, réponses existantes affichées |

## ProfileAnswer (table `profile_answers`)

| Champ | Type | Règle |
|---|---|---|
| `id` | uuid | PK |
| `userId` | uuid | FK `users.id`, **cascade** |
| `questionKey` | text | clé de la banque (validée à l'écriture) |
| `text` | text | 1–300 après normalisation (R6), sans contact |
| `status` | text | `published` (défaut) · `removed` (modération) |
| `createdAt` / `updatedAt` | timestamptz | |

Contraintes : `UNIQUE (userId, questionKey)` ; index `(userId)`. Au plus
**5** réponses `published` par membre (vérifié en transaction à l'écriture).
Réécrire une réponse `removed` la repasse en `published` (nouveau texte).

## État de lecture (dérivé, jamais stocké)

Pour une lectrice L et une réponse publiée R de P :

| L = P | L a une réponse **publiée** à `R.questionKey` | Sérialisé |
|---|---|---|
| oui | — | `{ key, label, text }` |
| non | oui | `{ key, label, text }` |
| non | non | `{ key, label, veiled: true }` |
| non | inconnu (lecture en échec) | `{ key, label, veiled: true }` |

Réponses `removed` de P : jamais envoyées à autrui ; envoyées à P avec
`status: 'removed'`.
