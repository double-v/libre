# Modèle de données — Spec 013

Une migration additive écrite à la main :
`prisma/migrations/2026111x_indices_connexion/migration.sql`. Aucune
nouvelle table ; deux colonnes et un remplissage.

## `users.pays_connexion_vus` (nouveau)

| Champ Prisma | Colonne | Type | Défaut | Règles |
|---|---|---|---|---|
| `paysConnexionVus` | `pays_connexion_vus` | `TEXT[]` | `'{}'` | Codes ISO 3166-1 alpha-2, après ramenage de l'outre-mer à `FR`. Sans doublon, **8 au plus** (on cesse d'ajouter au-delà : un compte qui a vu 8 pays porte déjà ses indices). Écrit seulement par `observerConnexion`, en une requête conditionnelle. |

**Privé** : jamais dans une réponse lue par autrui ni par le membre (garde
`city-label-never-leaks`). Lu seulement par `reevaluerPays` et par la fiche
admin. Effacé avec le compte (colonne de `users`).

## `profiles.pays_ville` (nouveau)

| Champ Prisma | Colonne | Type | Règles |
|---|---|---|---|
| `paysVille` | `pays_ville` | `CHAR(2)` nullable | Calculé par le serveur à chaque écriture de position (R4) : `FR` si les coordonnées tombent en France ou en outre-mer, sinon le code déduit du nom de pays d'une ville saisie, sinon `NULL`. Jamais accepté tel quel du client. |

**Privé** (même garde). Remplissage de la migration :

```sql
UPDATE profiles SET pays_ville = 'FR'
WHERE last_known_lat IS NOT NULL AND (<une des boîtes de territoires.ts>);
```

Les boîtes du SQL et celles de `territoires.ts` sont **les mêmes** : un test
`test:db` parcourt les boîtes du module et vérifie, pour chaque centre et
chaque coin intérieur, que le SQL donne le même résultat.

## `profile_signals` — nouveaux types (pas de changement de table)

Voir le tableau de `research.md` R8. Rappel des invariants existants :
- `@@unique([userId, cle])` : un pays, une catégorie ou une photo ne lève
  qu'une fois par compte, même sous course (`createMany` avec
  `skipDuplicates`, ou `upsert` vide, comme `enregistrerSignal`
  aujourd'hui) ;
- un signal n'est jamais effacé par cette spec ; il ne pèse plus après une
  décision du modérateur (`signauxRecents(…, decidedAt)`).

`extrait` vaut le code pays ou la catégorie, jamais une adresse ni un nom
d'opérateur. `photoKey` est renseigné pour les signaux d'image.

Mises à jour de code liées :
- `TypeSignal` (`src/lib/fraude/signaux.ts`) : les 4 types ;
- `TYPES_CONTEXTE` (`src/lib/fraude/fiabilite.ts`) : ajouter
  `pays_connexion`, `reseau_masque`, `photo_ia_retouchee` ;
- `LIBELLES_SIGNAL` et `MENTION_LEGITIME` (`src/lib/fraude/libelles.ts`) ;
- le commentaire `///` du champ `type` dans `schema.prisma`.

## Table des réseaux (donnée versionnée, pas en base)

`src/lib/connexion/table-reseaux.generated.ts` :

| Export | Type | Contenu |
|---|---|---|
| `GENEREE_LE` | `string` | Date ISO de génération |
| `SOURCES` | `ReadonlyArray<{ url, sha256, lignes }>` | Traçabilité de chaque fichier source |
| `DEBUTS_B64`, `FINS_B64` | `string` | `Uint32Array` triés, plages disjointes |
| `CATEGORIES_B64` | `string` | `Uint8Array` : 1 = `hebergement`, 2 = `vpn`, 3 = `relais` |

**Invariants vérifiés par test** sur le module généré, et pas seulement sur
le générateur : les débuts sont strictement croissants, chaque fin est
supérieure ou égale à son début et inférieure au début suivant, les
catégories valent 1 à 3, et les trois tableaux ont la même longueur.

## États dérivés (jamais stockés)

- **Indice de pays actif** : un signal `pays_connexion` postérieur à la
  dernière décision.
- **Table ancienne** : `GENEREE_LE` a plus de 180 jours. C'est affiché dans
  la fiche et le Guide, et ça n'a aucun effet sur le calcul.
