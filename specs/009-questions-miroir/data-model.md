# Data Model — 009 Questions de profil en miroir

## Question (code, `src/lib/questions.ts`)

| Champ | Type | Règle |
|---|---|---|
| `key` | string ASCII `[a-z-]+` | stable, unique, jamais réutilisée pour un autre sens |
| `theme` | string | `quotidien` · `culture` · `rire` · `liens` · `valeurs` · `envies` · `souvenirs` · `habitudes` · `rencontre` · `ceci-ou-cela` |
| `format` | `ouverte` \| `choix` \| `ceci-ou-cela` | voir FR-002b |
| `multiple` | boolean? | `choix` seulement : choix multiple si vrai |
| `options` | `{ key, label, exclusive? }[]` | 2–5 pour `choix`, exactement 2 pour `ceci-ou-cela` ; clés stables ; `exclusive` seulement si `multiple` |
| `label` | string | intitulé affiché, reformulable |
| `hint` | string? | aide à la saisie (ex. question `habitudes`) |
| `retired` | boolean? | retirée : plus proposée, réponses existantes affichées |

## ProfileAnswer (table `profile_answers`)

| Champ | Type | Règle |
|---|---|---|
| `id` | uuid | PK |
| `userId` | uuid | FK `users.id`, **cascade** |
| `questionKey` | text | clé de la banque (validée à l'écriture) |
| `choices` | text[] | `ouverte` : vide ; `ceci-ou-cela` et choix unique : exactement 1 ; choix multiple : ≥ 1, sans doublon, et une option `exclusive` seulement si elle est seule ; toutes ∈ options |
| `text` | text? | `ouverte` : 1–300 ; `choix` : 0–300 (précision) ; `ceci-ou-cela` : vide. Normalisé (R6), sans contact |
| `status` | text | `published` (défaut) · `removed` (modération) |
| `createdAt` / `updatedAt` | timestamptz | |

Contraintes : `UNIQUE (userId, questionKey)` ; index `(userId)`. Pas de
limite de nombre : une réponse par question, borné par la banque.
Réécrire une réponse `removed` la repasse en `published` (nouveau texte).

## État de lecture (dérivé, jamais stocké)

Pour une lectrice L et une réponse publiée R de P :

| L = P | L a une réponse **publiée** à `R.questionKey` | Sérialisé |
|---|---|---|
| oui | — | `{ key, label, format, choices, text? }` |
| non | oui | `{ key, label, format, choices, text? }` |
| non | non | `{ key, label, format, veiled: true }` (ni choix ni texte) |
| non | inconnu (lecture en échec) | `{ key, label, format, veiled: true }` |

Réponses `removed` de P : jamais envoyées à autrui ; envoyées à P avec
`status: 'removed'`.
