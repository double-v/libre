# Spec 003 — Dashboard admin analytics

## Objectif

Donner à l’équipe admin/produit de Libre une vue agrégée, rapide et actionnable sur la santé de la base de membres : qualité des profils, répartition démographique, engagement récent et activité de modération. L’objectif est de faire sauter aux yeux les leviers de croissance et les dysfonctionnements sans exposer de données individuelles.

## Portée MVP

- **Page** : enrichir le tableau de bord existant `/admin`.
- **Public** : administrateurs uniquement (`requireAdmin()`).
- **Période** : instantané + glissement 7 jours / 30 jours pour les indicateurs temporels.
- **Rendu** : barres CSS natives, pas de librairie de graphiques.
- **Données** : agrégations issues de Prisma ; pas d’export CSV, pas de filtre date personnalisé dans cette version.

## Indicateurs livrés

### 1. État des profils

| Indicateur | Description |
|---|---|
| Profils remplis vs vides | Profil rempli = `birthDate` renseigné, `genderIdentity` non vide, au moins une photo. |
| Taux de vérification | Part des comptes avec `User.isVerified = true`. |
| Photos | Part des profils avec photo + nombre moyen de photos par profil. |
| Géolocalisation | Part des profils ayant partagé une position (`lastGeolocAt != null`). |

### 2. Démographie

| Indicateur | Description |
|---|---|
| Genres | Top 8 des `genderIdentity` déclarées + « Autre ». Valeur vide ignorée. |
| Âges | Tranches 18-25, 26-35, 36-45, 46-55, 56+. Calcul depuis `birthDate`. |
| Orientations | Top 8 des valeurs déclarées dans `orientation` + « Autre ». |
| Types de relation | Top 8 des valeurs déclarées dans `relationshipType` + « Autre ». |
| Top intérêts | Top 10 des tags `interests`. |
| Top pratiques | Top 10 des tags `practices`. |

### 3. Engagement & rétention (30 jours glissants)

| Indicateur | Description |
|---|---|
| Messages | Nombre de `Message` créés. |
| Likes | Nombre de `Like` créés. |
| Matches | Nombre de `Match` créés. |
| Rencontres | Nombre d’`Encounter` créés. |
| Utilisateurs actifs 7j | `User.lastActive >= il y a 7 jours`. |
| Utilisateurs actifs 30j | `User.lastActive >= il y a 30 jours`. |

### 4. Modération (30 jours glissants)

| Indicateur | Description |
|---|---|
| Bannissements | `ModerationLog.action = 'BAN'`. |
| Débannissements | `ModerationLog.action = 'UNBAN'`. |
| Suppressions | `ModerationLog.action = 'DELETE_USER'`. |
| Signalements résolus | `Report.status = 'resolved'` avec `resolvedAt` dans la fenêtre. |
| Photos classifiées | Lignes `PhotoModeration` créées dans la fenêtre. |

## Non-go

- Pas de données individuelles (liste d’utilisateurs, contenus de messages, localisations précises).
- Pas de librairie de graphiques externe.
- Pas d’export CSV ni de filtre date personnalisable dans le MVP.
- Pas de graphiques en camembert ni courbes ; histogrammes par barres CSS uniquement.

## Privacy & sécurité

- L’API ne retourne que des compteurs et des distributions agrégées.
- Les requêtes sont protégées par `requireAdmin()` (404 en cas de rôle insuffisant).
- Les tranches d’âge sont volontairement larges pour ne pas permettre la ré-identification.

## Dépendances techniques

- Next.js App Router + Prisma 7.
- Requêtes SQL brutes (`$queryRaw`) autorisées pour les distributions sur tableaux PostgreSQL (`unnest`).
- Tokens Tailwind v4 du DS (`bg-coral`, `bg-surface`, `text-content`, etc.).

## Critères d’acceptation

1. `/admin` affiche les 5 cartes historiques + 4 sections analytics.
2. L’API `/api/admin/stats` retourne la nouvelle clé `analytics` avec tous les indicateurs MVP.
3. Les accès non-admin retournent 404 sur l’API.
4. `npx vitest run` passe avec les nouveaux tests.
5. `npm run lint` et `npx tsc --noEmit` sont verts.
