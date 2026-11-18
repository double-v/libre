# Data model — Bureau de modération (spec 011)

## Champs ajoutés

### `User` (`users`)

| Champ | Type | Défaut | Règle |
|---|---|---|---|
| `lastSeenAt` | `DateTime? @db.Date` (`last_seen_at`) | `NULL` | Jour de la dernière navigation authentifiée. Écrit au plus une fois par jour (R1). **Privé** : jamais sérialisé vers autrui ni dans un push. Index. |
| `preavisInactiviteAt` | `DateTime?` (`preavis_inactivite_at`) | `NULL` | Date d'envoi du préavis d'inactivité. Remis à `NULL` par toute présence. **Privé**. |

Amorçage dans la migration : `last_seen_at = CURRENT_DATE` si
`"emailVerified" IS NOT NULL`.

Aucune autre table. Les grappes ne sont pas stockées.

## Entités dérivées (non stockées)

### Grappe

```text
Grappe {
  id: string            // plus petit userId de la grappe, stable tant que la grappe l'est
  comptes: CompteGrappe[]
  liens: Lien[]         // arêtes qui ont formé la grappe
  raisons: string[]     // phrases complètes, une par type de lien ou de signal
  doublonProbable: { orphelinId: string, gardeId: string } | null
  niveauMin: NiveauFiabilite
  plusRecent: Date      // signal non tranché le plus récent
}

CompteGrappe {
  id, displayName, createdAt,
  emailVerifie: boolean, aPhoto: boolean,
  lastSeenAt: Date | null,
  niveau: NiveauFiabilite,
  etatVerification: 'aucune' | 'invite' | 'retrait' | 'verifie' | 'banni',
  signaux: { type, force, createdAt, extrait? }[]
}

Lien { de: userId, vers: userId, sorte: 'appareil' | 'connexion' | 'photo' | 'texte', a: Date }
```

Tri : `niveauMin` (douteux d'abord), puis `plusRecent` décroissant.

### Bilan de lot

```text
BilanLot {
  traites: string[],
  ignores: { userId, raison: 'deja_verifie' | 'deja_invite' | 'deja_retire' | 'soi_meme' | 'introuvable' }[],
  echecs: string[]
}
```

## États et transitions

### Présence et préavis

```text
présent (lastSeenAt ≥ J-90) ──90 j sans visite──▶ masqué de Découvrir
masqué ──visite──▶ présent
masqué ──J-335──▶ préavis (e-mail, preavisInactiviteAt=now)
préavis ──visite──▶ présent (preavisInactiviteAt=NULL)
préavis ──30 j sans visite──▶ supprimé (effacerCompte)
```

### Compte jamais vérifié

```text
inscrit (emailVerified NULL) ──lien valide pour l'adresse actuelle──▶ vérifié
inscrit ──correction d'adresse──▶ inscrit (nouvelle adresse, ancien lien invalide)
inscrit ──30 j──▶ supprimé (effacerCompte)
```

## Règles de conservation ajoutées (`REGLES_RETENTION`)

| id | Données | Durée | jours | depuis |
|---|---|---|---|---|
| `comptesNonVerifies` | Compte dont l'adresse n'a jamais été confirmée (compte entier) | 30 jours après l'inscription | 30 | `création` |
| `comptesInactifs` | Compte sans visite depuis un an (compte entier), après un e-mail de préavis 30 jours avant | 1 an après la dernière visite | 365 | `dernière présence` |

## Journal de modération (`moderationLog.action`) — nouvelles valeurs

| Action | Quand |
|---|---|
| `DELETE_DUPLICATE` | Suppression de l'orphelin d'un doublon probable (`reason` = « doublon »). |

Les gestes par lot réutilisent les actions unitaires existantes
(`INVITE_VERIFICATION`, actions de `deciderProfil`), une ligne par compte.
Les suppressions par purge ne journalisent pas de ligne de modération : elles
entrent dans le bilan de rétention, comme `retraitsSansSelfie`.
