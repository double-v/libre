# Contrats — Indice de fiabilité (spec 010)

Toutes les routes admin exigent le rôle admin (garde existante). Aucune route
membre ne renvoie niveau, signal, empreinte, `ipHash` ni `verifInviteeAt`.

## Membre

### `GET /api/users/profile` (modifiée)

Ajoute, **pour soi seulement** :

```json
{ "invitationVerification": true }
```

Absent (pas `false`) quand il n'y a pas d'invitation. Jamais présent dans
`GET /api/users/[id]` ni dans Découvrir.

### `PUT /api/users/profile` (modifiée)

Accepte `fuseau?: string` (≤ 64, format IANA) **avec** une ville manuelle.
Ignoré sinon. Jamais persisté. Réponse inchangée ; aucun refus lié au fuseau
ni au lexique.

### `POST /api/auth/register`, `POST /api/blocks`, `POST /api/likes` (modifiées)

Réponses **inchangées**, statuts inchangés. Analyse planifiée dans `after()` ;
une erreur d'analyse est journalisée sans PII (`fraude.analyse.failed` + type)
et n'affecte pas la réponse.

## Admin

### `GET /api/admin/users` (modifiée)

Paramètres ajoutés :

| paramètre | valeurs | effet |
|---|---|---|
| `niveau` | `douteux` · `a_surveiller` · `fiable` | filtre |
| `tri` | `recent` (défaut) · `fiabilite` | `fiabilite` : douteux d'abord, puis nombre de signaux récents décroissant |

Chaque ligne gagne `niveau` et `signauxRecents` (nombre). Paramètre inconnu →
400.

### `GET /api/admin/users/[id]` (modifiée)

Ajoute :

```json
{
  "fiabilite": {
    "niveau": "douteux",
    "invitation": { "depuis": "2026-10-05T10:00:00Z" },
    "indices": [
      { "type": "likes_rafale", "force": "fort", "date": "…", "extrait": null, "legitimePossible": false },
      { "type": "appareil_partage", "force": "faible", "date": "…", "autreUserId": "…", "legitimePossible": true }
    ]
  }
}
```

Libellés français dans `src/lib/fraude/libelles.ts` (existant), un par type.

### `POST /api/admin/profils-a-verifier/analyse` (modifiée)

Le rattrapage (FR-025) relance aussi : blocages, appareil partagé, lexique.
Idempotent (clés de dédup). Ne pose **aucune** invitation : le rattrapage
alimente la file, l'invitation ne part que sur un signal neuf (évite une vague
d'invitations au déploiement).

### `PATCH /api/admin/verifications/[id]` (modifiée)

Approuvé → `isVerified = true`, `retraitAt = null`, `verifInviteeAt = null`.
Refusé alors que `verifInviteeAt` posé → signal `verification_refusee`.
