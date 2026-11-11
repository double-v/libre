# Contrats d'API — Spec 012

Toutes les routes `/api/admin/*` exigent le rôle `ADMIN` (garde existante) et sont limitées en fréquence comme les autres routes admin. Réponses en JSON, erreurs `{ error: string }` en français.

## Côté membre

### `POST /api/moderation/verify/code` — tirer un code (remplace `…/verify/geste`)

- 200 `{ code: "7358", expireAt: ISO }`
- 409 `{ error, statut }` si une demande est en file ou si le profil est vérifié
- 429 `{ error, reessaiAt: ISO }` après trois refus consécutifs (FR-012)

### `POST /api/moderation/verify` — envoyer le selfie (modifiée)

Corps : multipart `selfie` + `code`.
- 201 `{ statut: "en_cours" }`. La lecture du code est planifiée dans `after()`.
- 410 `{ error: "Ce code a expiré ou a été remplacé.", nouveauCode: true }`

### `GET /api/moderation/verify` — statut (modifiée)

`{ statut: "aucune" | "en_cours" | "validee" | "refusee", motif?: { cle, texte, conseil }, reessaiAt?: ISO, tentative?: number }`

### `GET /api/moderation/avertissement` · `POST /api/moderation/avertissement/:id/lu`

- GET : `{ avertissement: { id, texte } | null }` (le plus ancien non lu)
- POST : 204, idempotent

### `POST /api/moderation/relecture`

Possible seulement si le membre est masqué et n'a pas de relecture en cours. 201, ou 409.

## Côté administration

### `GET /api/admin/membres`

Requête : `filtre` (`atraiter|verif|report|photo|reponse|indice|relecture|douteux|verifies|masques|bannis|nonconf|tous`), `tri` (`urgence|recent|fiabilite`), `q`, `curseur`.

```json
{
  "membres": [{
    "id": "uuid", "pseudo": "…", "avatar": "url|null",
    "inscritAt": "ISO", "vuLe": "YYYY-MM-DD|null",
    "verifie": true, "statut": "actif|banni|masque|non_confirme",
    "fiabilite": "fiable|a_surveiller|douteux",
    "cas": [{ "type": "report", "id": "uuid", "gravite": "bad", "depuis": "ISO", "n": 3 }]
  }],
  "curseur": "opaque|null",
  "compteurs": { "atraiter": 9, "verif": 3, "report": 2, "photo": 1, "reponse": 1, "indice": 2, "relecture": 0 }
}
```

### `GET /api/admin/membres/:id`

Fiche : identité, `cas[]` détaillés par type, signaux de fiabilité, photos (vignettes), comptes liés, historique (`{ at, action, motif, auteur: "pseudo admin" | "automatique" }`), `ouvertPar` par cas. L'appel écrit `admin_cas_ouverts` pour les cas de la fiche.

Détail d'un cas `verif` : `{ codeAttendu, codeLu, tentative, refusPrecedent?: { motif, at }, selfieUrl, ancienGeste?: string }`.

### `POST /api/admin/gestes`

```json
{ "gestes": [{
  "cle": "uuid",
  "membreId": "uuid",
  "cas": { "type": "verif", "id": "uuid" },
  "geste": "valider",
  "motif": "code"
}] }
```

Gestes par type :

| Type | Gestes (`motif` requis) |
|---|---|
| `verif` | `valider`, `refuser` (oui : `code|personne|ecran|visage`) |
| `report` | `sans_suite`, `avertir` (oui : clé d'avertissement), `masquer` (oui), `bannir` (oui) |
| `photo` | `garder`, `voiler`, `retirer` |
| `reponse` | `garder`, `retirer` |
| `indice` | `rien`, `inviter`, `supprimer_doublon` |
| `relecture` | `rendre_visible`, `maintenir` |
| hors cas (`cas: null`) | `inviter`, `avertir`, `masquer`, `rendre_visible`, `debannir`, `bannir`, `supprimer`, `voiler_photo`, `retirer_photo` |

Réponse 200 (toujours, même si certains gestes échouent) :

```json
{ "issues": [{ "cle": "uuid", "issue": "applique|deja_traite|cas_clos|echec", "par": "pseudo admin?" }] }
```

- 1 à 20 gestes, sinon 400.
- Rejouer une `cle` déjà appliquée rend la même issue, sans nouvel effet.
- Les effets de bord (push, e-mail, R2) partent dans `after()`.

### `GET /api/admin/activite?periode=7|30|90`

Agrégats seulement, mis en cache 10 min :

```json
{
  "periode": 30,
  "resume": { "passees": 252, "arrivees": 44, "matchs": 412, "messages": 3418, "actifsJour": 78, "variationActifs": 0.12 },
  "arrivees": { "parJour": [{ "jour": "YYYY-MM-DD", "n": 2 }], "avancee": { "inscrit": 44, "profilPret": 33, "main": 27, "match": 17, "converse": 12 } },
  "presence": { "parJour": [{ "jour": "…", "n": 81 }], "reperes": [{ "jour": "…", "titre": "…" }] },
  "moments": [[0.1, "…12 valeurs"], "…7 jours"],
  "restent": [{ "semaine": "YYYY-MM-DD", "arrivees": 22, "surDix": 4 }],
  "seParlent": { "tauxReponse": 0.64, "messagesParJour": [], "matchsParJour": [], "placeParJour": [] },
  "quiSontIls": { "ages": [], "intentions": [], "genres": [], "profils": {}, "questions": {}, "interets": [] },
  "soin": { "delaiMedianMin": 250, "parSemaine": [], "decisions": {}, "refusPuisEssai": { "refus": 11, "essais": 9, "valides": 7 } },
  "coulisses": { "retention": {}, "limites24h": 4, "coupees": ["checkin"] }
}
```

Les phrases ne sont pas dans la réponse : le client les compose avec `recit.ts` (FR-036).
