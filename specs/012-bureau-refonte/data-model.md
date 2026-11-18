# Modèle de données — Spec 012

Toutes les migrations sont **additives et écrites à la main** (constitution, contraintes techniques). Le schéma et la migration bougent dans le même commit.

## Nouvelles tables

### `verification_codes` — code de vérification en cours (US1, R1)

| Colonne | Type | Règle |
|---|---|---|
| `user_id` | uuid, PK, FK users (cascade) | une ligne par membre, écrasée à chaque tirage |
| `code` | text | quatre chiffres parmi 2–9 |
| `tire_at` | timestamptz | |
| `expire_at` | timestamptz | `tire_at` + 30 min |

Effacée à la mise en file du selfie. Privée : jamais sérialisée hors de la page du membre.

### `avertissements` (US6, R8)

| Colonne | Type | Règle |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK users (cascade) | |
| `code` | text | clé d'un message de `avertissements.ts` |
| `admin_id` | uuid FK users, nullable | auteur |
| `created_at` | timestamptz | |
| `lu_at` | timestamptz, nullable | posé à l'acquittement, une seule fois |

Index `(user_id, lu_at)`.

### `admin_cas_ouverts` (US5, R5)

| Colonne | Type | Règle |
|---|---|---|
| `cas` | text PK | `<type>:<id>` |
| `admin_id` | uuid FK users (cascade) | |
| `ouvert_at` | timestamptz | lu avec une fenêtre de 10 min |

## Colonnes ajoutées

### `verification_requests`

| Colonne | Type | Règle |
|---|---|---|
| `code_attendu` | text, nullable | le code du tirage ; nul pour les demandes au geste (FR-008) |
| `code_lu` | text, nullable | `null` = lecture en cours, `''` = impossible, sinon les chiffres lus |
| `tentative` | int, défaut 1 | rang de la demande depuis la dernière validation |

`challenge` (geste) est conservé tant que des demandes anciennes existent.

### `users`

| Colonne | Type | Règle |
|---|---|---|
| `masque_jusqua` | timestamptz, nullable | Découvrir exclut `> now()` |
| `masque_motif` | text, nullable | clé de liste fermée |
| `relecture_demandee_at` | timestamptz, nullable | cas « relecture » si postérieure au début du masquage |

Toutes **privées** : ajout à la garde `city-label-never-leaks.test.ts`.

### `moderation_logs`

| Colonne | Type | Règle |
|---|---|---|
| `cle` | uuid, nullable, **unique** | clé d'idempotence d'un geste du hub (R4) |

## Entités dérivées (jamais stockées)

### Cas

`{ type, id, membreId, gravite, depuis }`. Le type est l'un de `report`, `verif`, `photo`, `reponse`, `indice`, `relecture`. La gravité vaut `bad` pour report, `warn` pour verif, photo, reponse et relecture, `info` pour indice. Le cas est calculé à la lecture, à partir de :

| Type | Source |
|---|---|
| `report` | `reports.status = 'pending'` |
| `verif` | `verification_requests.status = 'pending'` |
| `photo` | photos signalées par la lecture OCR (spec 006) non tranchées |
| `reponse` | réponses en attente de modération (spec 009) |
| `indice` | `profile_signals` non tranchés (spec 010/011) |
| `relecture` | `users.relecture_demandee_at` non traitée |

### Limite de nouvel essai

`peutTirer(membre)` : faux si les trois dernières demandes sont `rejected` sans `approved` après elles, et si `now < resolvedAt(3e refus) + 24 h`.

### Issue d'un geste

`applique | deja_traite { par } | cas_clos | echec`.

## Transitions

**Vérification** : `aucune → code tiré → en file (pending) → validée | refusée → code tiré …`. Un 3ᵉ refus consécutif impose une attente de 24 h avant le tirage suivant.

**Masquage** : `visible → masqué (jusqu'à J+90) → relecture demandée → visible (geste « rendre visible ») | masqué (relecture refusée)`, et `masqué → visible` d'office à l'échéance.
