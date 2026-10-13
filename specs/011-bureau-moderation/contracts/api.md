# Contrats — Bureau de modération (spec 011)

Toutes les routes `/api/admin/*` exigent le rôle admin (`requireAdmin`).
Aucune route membre ne renvoie `lastSeenAt`, `preavisInactiviteAt`, grappe,
lien ni niveau.

## Admin

### `GET /api/admin/indices` (nouvelle)

Paramètres : `filtre=tous|doublons` (défaut `tous`), `niveau=douteux|a_surveiller`
(facultatif), `page` (défaut 1, 20 grappes par page).

```json
{
  "grappes": [Grappe],
  "total": 12,
  "doublons": 3
}
```

`Grappe` : voir `data-model.md`. `raisons` sont des phrases prêtes à afficher.

### `POST /api/admin/indices/[grappeId]/doublon` (nouvelle)

Corps : `{ "orphelinId": "uuid" }`. Recalcule la grappe ; refuse (409) si
elle n'est plus un doublon probable, si l'orphelin a vérifié son adresse
entre-temps, ou s'il a des photos, likes ou conversations.
Effet : `effacerCompte(orphelinId)`, journal `DELETE_DUPLICATE`, décision
`rien` sur le compte gardé.
Réponse : `{ "supprime": "uuid" }`.

### `POST /api/admin/indices/[grappeId]/rien` (nouvelle)

Applique la décision `rien` (via `deciderProfil`) à chaque compte de la
grappe. Réponse : `BilanLot`.

### `POST /api/admin/moderation/lot` (nouvelle)

```json
{ "geste": "invitation" | "retrait", "userIds": ["uuid", "..."] }
```

- 400 si `userIds` vide ou > 50, ou doublons dans la liste.
- `retrait` : 403 `{ "error": "…" }` si les comptes ne sont ni dans une même
  grappe, ni tous de niveau `douteux` (revérifié côté serveur).
- Réponse 200 : `BilanLot` (voir `data-model.md`), même en cas d'échecs
  partiels.

### Routes modifiées (comportement inchangé, implémentation partagée)

- `POST /api/admin/users/[id]/invitation` → `inviterVerification`.
- `POST /api/admin/profils-a-verifier/[userId]` → `deciderProfil`.
- `GET /api/admin/queues` : la clé `profils` devient `indices` (nombre de
  grappes non tranchées).
- `GET /api/admin/stats` : `actifs7j`, `actifs30j`, `revenus` calculés sur
  `lastSeenAt` ; nouveau bloc :

```json
{
  "presence": {
    "moins7j": 41, "moins30j": 63, "moins6mois": "< 5", "moins1an": 0,
    "plus1an": 0, "jamaisVerifies": 9, "enPreavis": 0
  }
}
```

Toute case inférieure à 5 vaut la chaîne `"< 5"`.

## Authentification

### `POST /api/auth/corriger-adresse` (nouvelle)

```json
{ "email": "ancienne@exemple.fr", "motDePasse": "…", "nouvelleAdresse": "nouvelle@exemple.fr" }
```

- Limiteur `auth` par IP.
- 200 `{ "envoye": true }` : adresse remplacée, nouveau lien envoyé.
- 400 `{ "error": "Adresse ou mot de passe incorrect." }` : compte absent,
  mot de passe faux, compte déjà vérifié ou banni (réponse uniforme).
- 409 : nouvelle adresse déjà prise, même message neutre que l'inscription.

### `GET /api/auth/verify-email` (modifiée)

Refuse (`/login?error=invalid-token`) un jeton dont l'adresse ne correspond
plus à l'adresse actuelle du compte.

## Pages

| Adresse | Statut |
|---|---|
| `/admin/indices` | nouvelle |
| `/admin/profils` | redirige vers `/admin/indices` |
| `/admin/users`, `/admin/reports`, `/admin/verifications`, `/admin/feedback` | filtres dans l'adresse (`useFiltresUrl`) |
| `/register` | double saisie, suggestion de domaine, annonce de la règle des 30 jours |
| `/login?registered=true` | adresse saisie affichée, règle des 30 jours, « corriger mon adresse » |
