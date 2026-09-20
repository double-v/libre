# Data Model — Le premier quart d'heure

Une seule colonne nouvelle. Tout le reste réutilise `Profile`, `push_subscriptions`
et le `localStorage` par appareil.

## Profile (existant) — champ ajouté

| Champ | Type | Défaut | Rôle |
|---|---|---|---|
| `onboardingStep` | `Int` | `0` | Prochaine étape du parcours à montrer. `0` photo, `1` ce que je cherche, `2` où, `3` terminé/passé. Monotone croissant. |

**Visibilité** : lu et écrit **par la membre seule** (`GET/PUT /api/users/profile`).
Jamais sélectionné dans une réponse destinée à autrui (`/api/users/[id]`,
`/api/discover`, `/api/geoloc/*`, charge utile push). Garde :
`src/__tests__/onboarding-step-never-leaks.test.ts`, calquée sur
`city-label-never-leaks.test.ts`.

**Validation** (`validators.ts`) : entier `0..3`. Le serveur refuse une
régression (`nouvelle < actuelle`) silencieusement en gardant le max —
un onglet en retard ne fait pas reculer le parcours (edge case « deux
onglets »).

**Transitions** :

```
0 ──photo enregistrée ou « Plus tard »──▶ 1
1 ──PUT profile (seeking + step:2)─────▶ 2
2 ──position/ville ou « Plus tard », PUT step:3──▶ 3   (puis StepPush, sans état en base)
```

## Champs existants mobilisés (aucun changement de schéma)

| Champ | Étape | Écriture |
|---|---|---|
| `Profile.photos` | photo | `POST /api/users/photos` |
| `Profile.relationshipType` | ce que je cherche | `PUT /api/users/profile` |
| `Profile.searchRelationshipTypes`, `searchGenders`, `searchOrientations` | ce que je cherche | idem, même requête |
| `Profile.lastKnownLat/Lng`, `lastGeolocAt`, `positionSource` | où (appareil) | `POST /api/geoloc/update` |
| `Profile.cityLabel`, `positionSource = 'city'` | où (ville) | `PUT /api/users/profile` `{ city }` (spec 004) |
| `PushSubscription` | push | `POST /api/push/subscriptions` (spec 003) |

## Dérivations (pas de stockage)

- **`hasPhoto(profile)`** = `photos.length > 0`. Clé de tri de « Pour toi » (FR-022).
- **`deriveMissing(profile)`** → `'photo' | 'seeking' | 'position' | null`, dans
  cet ordre. `seeking` manque si `relationshipType` est vide ; `position`
  manque si `lastGeolocAt` est nul **et** `cityLabel` est nul. Pilote la
  carte de relance (FR-017).
- **`mustOnboard(profile)`** = `onboardingStep < 3`. Après la migration, cette
  seule condition encode FR-011 et FR-023 (voir research R3).

## État par appareil (`localStorage`, best-effort, `try/catch`)

| Clé | Valeur | Rôle |
|---|---|---|
| `libre:nudge-dismissed` | ISO date | Carte de relance écartée ; réaffichée après 7 jours (FR-019) |
| `libre:push-asked` | ISO date | Proposition push déjà faite par le parcours sur cet appareil (FR-014) |

Les deux se lisent dans un `try/catch` : navigation privée ou stockage
bloqué ⇒ comportement « jamais écarté / jamais demandé », ce qui reste dans
la charte (une proposition de plus, jamais une relance de moins visible).

## Migration (additive, écrite à la main)

```sql
-- 1. Colonne
ALTER TABLE "profiles" ADD COLUMN "onboardingStep" INTEGER NOT NULL DEFAULT 0;

-- 2. Comptes sans profil : un profil vide (US1, #342). Idempotent.
INSERT INTO "profiles" ("userId", …défauts…)
SELECT u.id, … FROM "users" u LEFT JOIN "profiles" p ON p."userId" = u.id
WHERE p."userId" IS NULL;

-- 3. FR-023 : un profil existant qui a déjà photo OU type OU position
--    ne voit pas le parcours. Les entièrement vides restent à 0.
UPDATE "profiles" SET "onboardingStep" = 3
WHERE "onboardingStep" = 0
  AND (cardinality("photos") > 0
       OR cardinality("relationshipType") > 0
       OR "last_geoloc_at" IS NOT NULL
       OR "city_label" IS NOT NULL);
```

Les colonnes exactes de l'`INSERT` se lisent dans `schema.prisma` au moment
d'écrire la migration (tous les champs de `Profile` ont un défaut ou sont
nullables, sauf `userId`). Les comptes bannis ne sont pas exclus : un profil
vide chez un banni est inoffensif, et `baseWhere` du feed les filtre déjà.
