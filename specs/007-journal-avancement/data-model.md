# Modèle de données — spec 007

## `JournalPost` (nouvelle table `journal_posts`)

| Champ | Type | Règle |
|---|---|---|
| `id` | uuid, clé | |
| `slug` | texte, unique, nullable | `null` tant que jamais publiée ; fixé à la première publication, **jamais modifié ensuite** |
| `titre` | texte | 1 à 120 caractères |
| `corps` | texte | 1 à 20 000 caractères, texte restreint (research R2) |
| `statut` | texte | `brouillon` \| `publiee` |
| `publieeAt` | date, nullable | fixée à la **première** publication, conservée ensuite (republication, modification) |
| `modifieeAt` | date | mise à jour à chaque enregistrement |
| `createdAt` | date | |
| `auteurId` | uuid, FK `users`, `onDelete: SetNull`, nullable | jamais affiché publiquement (« L'équipe Libre ») |
| `commentsOpen` | booléen, défaut `false` | sans interface au MVP (FR-011) |

Index : `(statut, publieeAt desc)` pour la liste publique.

### Transitions

```
(nouveau) ──créer──▶ brouillon ──publier*──▶ publiee
                        ▲    │                 │  ▲
                        │    └──supprimer (si publieeAt = null)
                        └──────dépublier───────┘  └──modifier* (reste publiee)
```

`*` = passe par les garde-fous (research R3) : aucune alerte bloquante, toutes
les alertes levables levées, `reglesRelues = true`. Sinon 422, rien n'est écrit.

- Une publication **publiée** ne s'édite pas en place : sa modification est une
  republication qui repasse les garde-fous (US2 scénario 5).
- **Supprimer** n'existe que pour un brouillon jamais publié ; une publication
  déjà publiée se dépublie (son slug reste réservé).

## `SiteConfig.featuresEnabled` (colonne ajoutée)

| Champ | Type | Règle |
|---|---|---|
| `featuresEnabled` | `String[]`, défaut `[]` | clés **activées** parmi celles coupées par défaut ; sans `@map` |

Lecture : `active(f) = DEFAUTS[f] ? !featuresDisabled.has(f) : featuresEnabled.has(f)`.
Nouvelle clé : `journal_comments` (défaut coupé).

## Règles éditoriales (code, pas de table)

`src/lib/journal/regles.ts` : `{ id: 'r1'…'r7', enonce, aEviter, plutot, motifs: Motif[] }` ;
`Motif = { id, description, bloquant: boolean, trouver(texte) → extraits[] }`.
Versionnées avec le code ; l'écran et le contrôle lisent la même liste.

## Alerte (valeur calculée, jamais stockée)

`{ regle: 'r3', motif: 'chemin-technique', extrait: '/api/…', bloquante: false, empreinte: '<sha256 tronqué de regle+extrait>' }`

## Trace de modération (table existante `moderation_logs`)

`action` ∈ `PUBLISH_POST` · `UPDATE_POST` · `UNPUBLISH_POST` · `DELETE_DRAFT` ;
`adminId` = `targetUserId` = l'admin ; `reason` = `post:<id>` (+ ` ; levees: r3,r5`).
