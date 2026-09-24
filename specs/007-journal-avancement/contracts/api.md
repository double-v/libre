# Contrats — spec 007

Toutes les routes `/api/admin/**` passent par `requireAdmin()` (404 pour un
non-admin, comme le reste de l'admin). Corps JSON, erreurs `{ error }` en
français sans détail interne.

## Pages publiques (rendu statique, jamais de session)

### `/journal`
Liste des publications `publiee`, `publieeAt` décroissant : titre, date, extrait
(premier paragraphe, texte brut, ~200 caractères). État vide si aucune.
Métadonnées : titre « Où en est Libre », description fixe, canonical.

### `/journal/[slug]`
Titre, date (« 24 septembre 2026 »), corps rendu (research R2), signature
« L'équipe Libre ». Slug inconnu, brouillon ou dépubliée → `notFound()`.
Métadonnées Open Graph : `title` = titre, `description` = extrait, type `article`,
`publishedTime` = `publieeAt`.

## Admin

### `GET /api/admin/journal`
`{ posts: [{ id, titre, statut, slug, publieeAt, modifieeAt }] }` — tous statuts, `modifieeAt` décroissant.

### `POST /api/admin/journal` — créer un brouillon
Entrée `{ titre, corps }` → 201 `{ post }`. 400 si longueurs hors bornes.

### `GET /api/admin/journal/[id]`
→ `{ post: { id, titre, corps, statut, slug, publieeAt, modifieeAt } }` ; 404 sinon.

### `PUT /api/admin/journal/[id]` — enregistrer un brouillon
Entrée `{ titre, corps }`. **409** si la publication est `publiee` (sa modification passe par `publier`).

### `DELETE /api/admin/journal/[id]`
204 si brouillon jamais publié ; **409** sinon. Trace `DELETE_DRAFT`.

### `POST /api/admin/journal/controle` — contrôler sans publier
Entrée `{ titre, corps }` → `{ alertes: Alerte[] }` (data-model). Aucun effet.

### `POST /api/admin/journal/[id]/publier`
Entrée `{ titre, corps, levees: string[], reglesRelues: boolean }`.
Le serveur **recontrôle** `titre` + `corps` :
- alerte bloquante présente, empreinte levable absente de `levees`, ou `reglesRelues !== true` → **422** `{ error, alertes }`, rien n'est écrit ;
- sinon : enregistre, `statut = publiee`, fixe `slug` et `publieeAt` s'ils sont nuls, trace `PUBLISH_POST` (ou `UPDATE_POST` si déjà publiée) avec les règles levées, `revalidatePath` de la liste et de la page → 200 `{ post }`.

### `POST /api/admin/journal/[id]/depublier`
`publiee` → `brouillon`, trace `UNPUBLISH_POST`, `revalidatePath` → 200. 409 si déjà brouillon.

## Fonctionnalités (existant, étendu)

### `GET /api/features` · `PUT /api/admin/features`
La carte gagne `journal_comments` (défaut `false`). Le `PUT` écrit
`featuresDisabled` (clés actives par défaut, coupées) **et** `featuresEnabled`
(clés coupées par défaut, activées). Client : pour une clé coupée par défaut,
seul un `true` explicite l'active.
