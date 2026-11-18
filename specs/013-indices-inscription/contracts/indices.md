# Contrats — Spec 013

Aucune route HTTP nouvelle. Les contrats sont ceux des modules (fonctions
pures, testées sans HTTP) et des effets sur les routes existantes.

## `src/lib/connexion/pays.ts`

```ts
/** Code ISO validé, ramené à FR pour l'outre-mer ; null si absent ou invalide. */
paysConnexion(headers: Headers | Record<string, string | string[] | undefined>): string | null
/** R4 : coordonnées d'abord, nom de pays ensuite ; null si indéterminé. */
paysVille(position: { lat: number; lng: number } | null, nomPays?: string | null): string | null
/** Comparaison après ramenage ; false si l'un des deux est null. */
paysDifferent(connexion: string | null, ville: string | null): boolean
```

- `paysConnexion` lit **seulement** `x-vercel-ip-country`. Il refuse tout ce
  qui n'est pas `/^[A-Z]{2}$/` connu de `Intl.DisplayNames`, donc `XX`, `T1`,
  `zz` ou `FRA`.
- `paysDifferent(null, x)` et `paysDifferent(x, null)` valent `false`
  (FR-008 appliqué au pays).

## `src/lib/connexion/reseau.ts`

```ts
type CategorieReseau = 'hebergement' | 'vpn' | 'relais';
/** null : adresse IPv6, invalide, 'unknown' ou absente de la table. */
categorieReseau(ip: string): CategorieReseau | null
export const TABLE_RESEAUX_DATE: string; // = GENEREE_LE
```

Le parseur IPv4 est strict : quatre octets décimaux de 0 à 255, sans zéro
en tête ambigu. Les formes `::ffff:a.b.c.d` sont ramenées à l'IPv4.

## `src/lib/connexion/indices.ts`

```ts
observerConnexion(args: { userId: string; headers: …; ip: string }): Promise<void>
reevaluerPays(userId: string): Promise<void>
```

- Ne lève jamais. Elle journalise au plus `{ evt: 'connexion.indices.echec',
  err: err.name }`.
- Effets possibles et seuls autorisés : une mise à jour de
  `users.pays_connexion_vus`, et des créations de `profile_signals` des
  types `pays_connexion` et `reseau_masque`.
- `relais` et `null` n'écrivent aucun signal.

## `src/lib/photo-ia.ts`

```ts
declarationIA(buffer: Buffer): 'generee' | 'retouchee' | null
```

Pure, synchrone, sans décodage ni réseau. Ses bornes sont fixées par R6.

## `televerserPhoto` (`src/lib/r2.ts`)

`PhotoTeleversee` gagne `ia: 'generee' | 'retouchee' | null`, calculé sur
l'original **avant** `retirerMetadonnees`. Le fichier stocké reste sans
métadonnées (le test #441 est inchangé et doit passer).

## Effets sur les routes existantes

| Route | Effet ajouté (toujours dans `after()`, jamais sur le statut) |
|---|---|
| `POST /api/auth/register` | `observerConnexion` |
| `POST /api/auth/callback/credentials` (via `authorize`) | `observerConnexion` après succès seulement ; jamais pour un échec, un banni ou un e-mail non confirmé |
| `PUT /api/users/profile` (`city`) | écrit `pays_ville` (dans la même écriture), puis `reevaluerPays` |
| `POST /api/geoloc/update` | écrit `pays_ville`, puis `reevaluerPays` |
| `POST /api/users/photos` | signal `photo_ia_*` si `ia` non nul |
| `POST /api/moderation/verify` | signal `photo_ia_*` sur le selfie si `ia` non nul |

Les réponses de ces routes **ne changent pas** : même statut, mêmes clés.
Un test par route le vérifie avec un en-tête de pays étranger.

## Lecture admin (fiche, spec 012)

`signaux[]` de la fiche ne change pas de forme. Pour les nouveaux types :
- `libelle` : « Connexion depuis un autre pays que celui de sa ville
  (Côte d'Ivoire) » (pays en clair, à partir d'`extrait`) ; « Connexion par
  un réseau d'hébergement » ou « … par un VPN » ; « Photo déclarée générée
  par IA » ; « Photo retouchée par IA » ;
- `legitimePossible` : voir `MENTION_LEGITIME` dans les tâches US4.

La fiche ajoute en pied « Table des réseaux du JJ/MM/AAAA », avec la
mention « ancienne » au-delà de 180 jours.
