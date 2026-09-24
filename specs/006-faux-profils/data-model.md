# Modèle de données — spec 006

Toutes les tables en `@@map` snake_case, identifiants UUID. Une migration.

## ProfileSignal (`profile_signals`)

Un indice sur un profil. Supprimé avec le compte (cascade).

| Champ | Type | Règle |
|---|---|---|
| id | uuid | |
| userId | uuid → users (cascade) | |
| type | texte | `contact_pseudo` · `contact_bio` · `contact_photo` · `photo_reutilisee` · `photo_bannie` · `photo_recuperee` · `signalement_faux` |
| force | texte | `faible` · `fort` |
| extrait | texte ≤ 200, nullable | le passage repéré (contact) ; jamais la bio entière |
| photoKey | texte, nullable | clé R2 de la photo en cause |
| autreUserId | uuid, nullable, **sans FK** | compte qui porte la même photo (le lien survit à sa suppression) |
| cle | texte | clé de déduplication : `type` + contenu normalisé (ou `photoKey`) |
| createdAt | date | |

- Unicité `(userId, cle)` : le même signal sur le même contenu ne crée pas de
  seconde ligne — c'est ce qui l'empêche de rouvrir un dossier tranché (FR-016).
- Jamais lu par une route destinée aux membres (test de non-fuite, patron
  `city-label-never-leaks`).

## PhotoFingerprint (`photo_fingerprints`)

Empreinte d'une photo **en ligne**. Supprimée avec la photo et avec le compte.

| Champ | Type | Règle |
|---|---|---|
| photoKey | texte, PK | |
| userId | uuid → users (cascade) | |
| hash | bigint | dHash 64 bits (signé) |
| createdAt | date | |

## BannedPhotoFingerprint (`banned_photo_fingerprints`)

Empreinte retenue d'un compte **banni** (FR-018). Pas de photo, pas de FK : elle
survit à la suppression du compte, puis part avec la purge de rétention.

| Champ | Type | Règle |
|---|---|---|
| id | uuid | |
| hash | bigint | |
| bannedUserId | uuid, sans FK | pour renvoyer vers la fiche tant qu'elle existe |
| bannedAt | date | règle de rétention `empreintesBannies` : **1 an** |

## ProfileReview (`profile_reviews`)

La dernière décision sur un profil. Supprimée avec le compte.

| Champ | Type | Règle |
|---|---|---|
| userId | uuid, PK → users (cascade) | |
| decision | texte | `rien` · `verification` · `banni` |
| decidedAt | date | |
| decidedBy | uuid → users (set null) | |

## User — champ ajouté

| Champ | Type | Règle |
|---|---|---|
| retraitAt | date, nullable | posé par la décision `verification` ; remis à `null` quand le badge est approuvé (#436). **Privé** : jamais dans une réponse lue par autrui. |

## Règles dérivées (pas stockées)

- **Dans la file** ⇔ au moins un signal postérieur à `ProfileReview.decidedAt`
  (ou aucune décision), **et** (un signal `fort` **ou** deux signaux **ou** un
  `signalement_faux`). `photo_recuperee` seul ne compte jamais (FR-008).
- **Ordre** : nombre de signaux forts décroissant, puis signal le plus récent.
- **Visible par autrui** ⇔ `isBanned = false` **et** `retraitAt = null`.

## Rétention (`src/lib/retention/regles.ts`)

| Règle | Durée | Départ |
|---|---|---|
| `empreintesBannies` | 1 an | bannissement |
| `signauxTranches` | 1 an | décision « Rien à signaler » (signaux antérieurs à la décision) |

Les deux apparaissent d'elles-mêmes dans §5 de la politique (test existant).
