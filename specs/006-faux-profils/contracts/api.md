# Contrats d'API — spec 006

Toutes les routes admin passent par `requireAdmin()` ; 401/403 sinon.

## Admin

### `GET /api/admin/photos/recherche?cle=<clé R2>&moteur=lens|yandex|tineye` (US1)

- Journalise `SEARCH_PHOTO` (admin, membre propriétaire, clé, moteur).
- **302** vers le moteur avec une URL R2 signée 15 min de l'**original**.
- 400 moteur inconnu ; 404 clé absente des photos d'un profil.

### `GET /api/admin/profils-a-verifier` (US4)

```json
{ "profils": [{
  "user": { "id": "…", "displayName": "…", "emailMasque": "…", "createdAt": "…",
            "isVerified": false, "retrait": false, "photos": ["/api/photos/…"] },
  "signaux": [{ "type": "contact_photo", "force": "fort", "extrait": "@lola_privee75",
                "photo": "/api/photos/…", "autreUser": { "id": "…", "banni": true } | null,
                "createdAt": "…" }],
  "signalements": 2,
  "derniereDecision": { "decision": "rien", "decidedAt": "…" } | null
}]}
```

### `PATCH /api/admin/profils-a-verifier/<userId>` (US4)

- Corps : `{ "decision": "rien" | "verification" | "banni", "motif"?: string ≤ 500 }`.
- `verification` → `retraitAt = now()` ; `banni` → chemin de bannissement
  existant + copie des empreintes en `banned_photo_fingerprints`.
- Journalise `PROFILE_REVIEW_<DECISION>`. 200 `{ ok: true }`.

### `POST /api/admin/profils-a-verifier/analyse` (FR-011)

- Analyse le lot suivant de 10 profils jamais analysés.
- 200 `{ traites: 10, restants: 37 }`.

### `GET /api/admin/queues` — champ ajouté

- `profils: <nombre de profils dans la file>`.

## Membre

### `PUT /api/users/profile` et mise à jour du pseudo — comportement ajouté (FR-020)

- Bio ou pseudo avec un contact externe **fort** → **400**
  `{ "error": "Les contacts se partagent dans la messagerie, une fois le match fait.", "extrait": "t.me/xyz" }`
  et signal `contact_bio` / `contact_pseudo` ajouté.
- Motif faible → enregistré, signal faible ajouté.

### `POST /api/users/photos` — effet ajouté

- Réponse inchangée. Après la réponse : lecture du texte, empreinte, forme du
  fichier → signaux éventuels.

### Membre en retrait (FR-018b)

- `POST` message et like → **403** `{ "error": "verification_requise" }`.
- `GET /api/users/profile` → `retrait: true` (le membre lui-même seulement),
  pour afficher l'invitation à se faire vérifier.
- Profil absent de : Découvrir, À proximité, Croisements, profil public
  `GET /api/users/<id>` (404), contacts du Cercle.
