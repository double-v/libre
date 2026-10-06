# Data Model — Indice de fiabilité (spec 010)

Une migration, **non destructive** (ajouts et une contrainte relâchée). Jamais
modifiée après push (Vercel lance `migrate deploy` sur la prod partagée, même
en prévisualisation).

## `profile_signals` (existante) — nouveaux types

| type | force | famille | clé de dédup | déclencheur |
|---|---|---|---|---|
| `bloque_repetition` | fort | comportement | `bloque:<AAAA-MM-JJ>` | 3e blocage en 48 h (R2) |
| `retour_banni` | fort | identité | `banni:<kind>` | inscription (R1) |
| `lexique_arnaque` | fort | texte | `lexique:<terme>` | bio, pseudo (R4) |
| `likes_rafale` | fort | comportement | `likes:<AAAA-MM-JJ>` | like (R3) |
| `verification_refusee` | fort | décision | `refus:<verificationId>` | refus du badge en invitation (R9) |
| `appareil_partage` | faible | contexte | `appareil:<autreUserId>` | inscription (R5) |
| `inscriptions_groupees` | faible | contexte | `ip:<AAAA-MM-JJ>` | inscription (R5) |
| `fuseau_incoherent` | faible | contexte | `fuseau` | ville manuelle (R6) |
| `profil_express` | faible | contexte | `express` | like (R7) |

Le commentaire `///` du champ `type` est mis à jour. `extrait` reste ≤ 200 et
ne porte **jamais** d'IP, d'e-mail, de `deviceId` ni de fuseau.

## `banned_identity_fingerprints` (nouvelle)

| champ | type | note |
|---|---|---|
| id | uuid | |
| kind | text | `appareil` · `email` |
| hash | text | HMAC-SHA256 hex (R1) |
| bannedUserId | uuid | sans clé étrangère, survit à l'effacement |
| bannedAt | timestamptz | départ de la rétention |

Index `(kind, hash)`, `(bannedAt)`. Rétention : règle
`empreintesIdentiteBannies`, 365 j depuis le bannissement.

## `signup_traces` (nouvelle)

| champ | type | note |
|---|---|---|
| id | uuid | |
| ipHash | text | HMAC-SHA256 hex, clé distincte de R1 |
| userId | uuid | sans clé étrangère |
| createdAt | timestamptz | |

Index `(ipHash, createdAt)`, `(createdAt)`. Rétention : règle
`tracesInscription`, 7 j depuis la création.

## `users` — champ ajouté

- `verifInviteeAt DateTime?` — **privé** (garde de non-fuite). Posé par
  `evaluerCompte`, remis à `null` par le badge. Lu par soi seulement, sous la
  forme du booléen `invitationVerification`.

## `likes` — index ajouté

- `@@index([likerId, createdAt])` pour la fenêtre glissante (R3).

## `moderation_logs` — contrainte relâchée

- `adminId` devient facultatif (`String?`, relation facultative) ; `null` =
  action automatique. Nouvelle action `INVITE_VERIFICATION`. L'affichage admin
  du journal rend `null` par « Automatique ».

## Dérivés (jamais stockés)

- **douteSerieux** : un signal fort récent, ou ≥ 3 faibles récents de types
  différents.
- **niveau** : `douteux` | `a_surveiller` | `fiable`, cran de moins si vérifié.
- **récent** : `createdAt > profile_reviews.decidedAt` (ou tout, sans décision).

## Transitions de l'invitation

```
(aucune) --douteux ∧ ¬vérifié ∧ ¬retrait ∧ ¬invité--> invité   [journal auto]
invité   --badge approuvé-->                          (aucune)
invité   --badge refusé-->                            invité + signal verification_refusee → file
invité   --modérateur « Demander une vérification »--> retrait (spec 006) ; l'invitation s'efface au profit de l'avis de retrait
```

## Rétention (`src/lib/retention/regles.ts`)

| id | données | durée | depuis |
|---|---|---|---|
| `empreintesIdentiteBannies` | Empreintes chiffrées de l'appareil et de l'e-mail d'un compte banni | 1 an | bannissement |
| `tracesInscription` | Empreinte chiffrée de l'adresse IP d'inscription | 7 jours | création |

Les signaux suivent la règle existante `signauxTranches`.
