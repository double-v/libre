# Recherche — Spec 013

Chaque décision suit le même format : la décision, sa raison, puis les
options écartées.

## R1 — Source du pays de connexion

**Décision** : l'en-tête `x-vercel-ip-country`, lu côté serveur. Il est
accepté seulement s'il vaut deux lettres majuscules d'un code ISO 3166-1
connu de `Intl.DisplayNames`. Sinon, ou s'il est absent (développement,
tests, en-tête manquant), le pays est inconnu et aucun indice n'est levé.

**Raison** : la passerelle de Vercel calcule cet en-tête à partir de
l'adresse qui se connecte, avant la fonction
([en-têtes de requête Vercel](https://examples.vercel.com/docs/headers/request-headers),
[`@vercel/functions` headers.d.ts](https://cdn.jsdelivr.net/npm/@vercel/functions@2.2.3/headers.d.ts)).
Les fonctions ne sont pas joignables autrement que par cette passerelle. La
doc dit explicitement que Vercel réécrit `X-Forwarded-For` pour empêcher
l'usurpation d'adresse
([doc Vercel](https://zeit.co/docs/v2/network/headers)), mais ne dit rien
d'aussi net pour l'en-tête pays. On considère donc qu'il est **probablement**
non falsifiable, sans le tenir pour acquis.

Ce qui rend ce doute acceptable : falsifier l'en-tête ne sert qu'à **éviter**
l'indice sur son propre compte, exactement comme un VPN. On ne peut pas s'en
servir pour accuser autrui, car l'indice porte sur le compte qui se connecte.
L'en-tête sert à **lever** un indice, jamais à en lever un de moins.

À vérifier au déploiement (tâche dédiée) : une requête de prévisualisation
avec `x-vercel-ip-country: ZZ` forgé doit arriver à la fonction avec le vrai
pays.

**Écartées** :
- Une base locale adresse → pays (GeoLite2) : licence MaxMind avec compte,
  ~8 Mo, mise à jour à gérer, pour une information que l'hébergeur donne
  déjà.
- Un service de géolocalisation en ligne : interdit par la spec (aucun
  service extérieur), et il ferait sortir l'adresse des membres.

## R2 — Adresse de la requête

**Décision** : `getClientIp` (`src/lib/client-ip.ts`), c'est-à-dire la
première entrée de `x-forwarded-for`, que Vercel réécrit. L'adresse sert
**seulement en mémoire**, le temps de la recherche dans la table. Elle n'est
ni stockée, ni hachée pour cet usage, ni journalisée.

**Constat hors périmètre** : `consents.ip_address` conserve déjà l'adresse
en clair à l'inscription, au titre de la traçabilité du consentement
(art. 7(1)). C'est un traitement distinct, que cette spec ne change pas.
FR-S01 vaut pour les traitements de la spec 013. Le constat est consigné
dans `securite.md` pour que l'opérateur décide à part de sa durée de
conservation.

## R3 — Table des réseaux d'hébergement et de VPN

**Décision** : une table **générée hors ligne** et versionnée, à partir de
deux sources publiques.

1. [X4BNet/lists_vpn](https://github.com/X4BNet/lists_vpn), sous licence MIT
   d'après son README. Les fichiers `output/datacenter/ipv4.txt` donnent la
   catégorie `hebergement`, `output/vpn/ipv4.txt` donne `vpn`. La licence
   est revérifiée sur le fichier `LICENSE` du dépôt par la tâche de
   génération, avant tout commit de la table.
2. La liste des sorties du relais privé d'Apple, publiée par Apple pour
   permettre la géolocalisation et les listes d'autorisation
   (`https://mask-api.icloud.com/egress-ip-ranges.csv`). Seules les plages
   IPv4 qui **recoupent** une plage de la source 1 sont gardées, avec la
   catégorie `relais`. Elles gagnent sur `hebergement` et `vpn` : le relais
   Apple sort par des hébergeurs (Akamai, Cloudflare, Fastly), et sans cette
   priorité, des milliers d'utilisatrices d'iPhone lèveraient l'indice.

**Format** : `src/lib/connexion/table-reseaux.generated.ts` exporte :
- `GENEREE_LE` (date ISO) et `SOURCES` (URL, empreinte SHA-256 et nombre de
  lignes de chaque fichier source) ;
- trois tableaux encodés en base64 (`Uint32Array` des débuts, des fins, et
  `Uint8Array` des catégories). Les plages sont triées, fusionnées et
  rendues disjointes par le générateur, avec la priorité `relais` > `vpn` >
  `hebergement`.

La recherche est dichotomique, en O(log n), et la table n'est décodée qu'une
fois par instance de fonction.

**IPv6** : non couvert dans ce lot. Une adresse IPv6 donne `null`, donc
aucun indice (FR-008 : dans le doute, on s'abstient). C'est une limite
assumée et écrite dans le Guide : beaucoup d'opérateurs mobiles français
servent de l'IPv6, mais la plupart des hébergeurs et des VPN sortent encore
en IPv4. À reprendre si les agrégats de SC-005 montrent un trou.

**Taille** : budget < 1 Mo pour le module généré. Le générateur échoue
au-delà. Le poids réel est mesuré et consigné dans la PR.

**Mise à jour (FR-009)** : `node scripts/reseaux/generer-table.mjs <dossier
des sources>`, puis une PR. La date `GENEREE_LE` s'affiche dans le Guide de
modération. Au-delà de 180 jours, la fiche le signale (« table des réseaux
ancienne »), mais rien ne casse.

**Écartées** :
- Une base ASN (iptoasn, GeoLite2-ASN) avec une liste de numéros d'AS
  d'hébergeurs à tenir à la main : deux sources à maintenir au lieu d'une,
  et une liste d'AS « hébergeur » serait de toute façon tirée d'X4BNet.
- [client9/ipcat](https://github.com/client9/ipcat) : non maintenue.
- Un service en ligne (IPQualityScore, ipinfo) : interdit et payant.
- Cloudflare WARP : il n'existe pas de liste publique de ses sorties. Ses
  utilisateurs sortent par des plages Cloudflare, classées `hebergement`.
  C'est un faux positif accepté (indice faible), décrit dans le Guide.

## R4 — Pays de la ville déclarée

**Décision** : une nouvelle colonne `profiles.pays_ville` (code ISO, ou
`NULL`), **calculée par le serveur** à chaque écriture de position :
1. si les coordonnées tombent dans une des boîtes de la France
   métropolitaine ou d'un territoire d'outre-mer, le pays vaut `FR` ;
2. sinon, pour une ville saisie, le nom de pays reçu (`city.country`,
   donné en français par Photon) est converti en code par une table inverse
   construite au chargement depuis `Intl.DisplayNames('fr', { type:
   'region' })`, après normalisation (apostrophes, casse, accents) ;
3. sinon, `NULL`, et aucune comparaison n'a lieu.

Le même calcul vaut pour la position de l'appareil
(`/api/geoloc/update`) : la position floutée suffit, car la boîte de la
France est large.

**Raison** : `city.country` vient du client (`profileUpdateSchema`, chaîne
libre). Sans l'étape 1, un fraudeur pourrait envoyer les coordonnées de
Lyon avec `country: "Côte d'Ivoire"`. Il apparaîtrait près de Lyon dans
Découvrir, sans jamais lever l'indice. Avec l'étape 1, des coordonnées
françaises donnent toujours `FR`.

**Territoires** : la métropole, la Corse, la Guadeloupe, la Martinique, la
Guyane, La Réunion, Mayotte, Saint-Pierre-et-Miquelon, Saint-Barthélemy,
Saint-Martin, Wallis-et-Futuna, la Polynésie française, la
Nouvelle-Calédonie et les Terres australes et antarctiques françaises.

Côté connexion, tous ces territoires sont ramenés à `FR` : `RE`, `GP`, `MQ`,
`GF`, `YT`, `PM`, `BL`, `MF`, `WF`, `PF`, `NC` et `TF` deviennent `FR`.
Les boîtes sont grossières mais généreuses : un faux négatif près d'une
frontière, par exemple une boîte qui déborde sur la Belgique, ne fait que
taire un indice faible.

**Remplissage des profils existants** : dans la migration, en SQL, avec les
mêmes boîtes sur `last_known_lat` et `last_known_lng`. Les profils
existants hors de France restent à `NULL` jusqu'à leur prochaine écriture
de position, car leur nom de pays n'a pas été conservé.

**Écartées** :
- Garder le nom de pays du client : falsifiable (voir plus haut).
- Re-géocoder côté serveur : un appel réseau à chaque écriture, et cela
  contredit FR-S05.
- Un polygone exact des frontières (Natural Earth) : plusieurs centaines de
  Ko pour gagner quelques kilomètres sur un indice faible.

## R5 — Où observer la connexion

**Décision** : un seul point d'effet, `observerConnexion({ userId, headers,
ip })`, appelé dans `after()` depuis deux endroits :
- `POST /api/auth/register`, à côté d'`analyserInscription` ;
- `authorize(credentials, req)` de NextAuth, après une authentification
  réussie. NextAuth 4 passe `req.headers` comme un objet aux clés en
  minuscules. `after()` est valable, car `authorize` s'exécute dans le
  gestionnaire de route `[...nextauth]`.

Une connexion compte **une fois par session** : une session JWT dure jusqu'à
30 jours, et le rappel `jwt` n'a pas accès à la requête. On l'assume : un
faux compte se reconnecte au moins une fois, et l'inscription est toujours
observée.

`observerConnexion` :
1. lit le pays (R1) et la catégorie de réseau (R3) ;
2. ajoute le pays à `users.pays_connexion_vus`, sans doublon et dans une
   limite de 8 codes, en une seule requête SQL conditionnelle
   (`array_append` si absent et si la longueur est inférieure à 8) ;
3. si `profiles.pays_ville` est connu et diffère, après ramenage de
   l'outre-mer, enregistre le signal `pays_connexion` avec la clé
   `pays:<CC>` ;
4. si la catégorie est `hebergement` ou `vpn`, enregistre `reseau_masque`
   avec la clé `reseau:<categorie>` ;
5. avale toute erreur et journalise seulement son nom (`err.name`), jamais
   l'adresse, le pays ou l'identifiant.

**Réévaluation (FR-004, FR-005)** : à chaque écriture de `pays_ville`, on
appelle `reevaluerPays(userId)`. Elle compare tous les pays de
`pays_connexion_vus` au nouveau pays de la ville et enregistre les signaux
qui manquent. Un signal déjà enregistré n'est jamais retiré : l'historique
reste (cas limite « changement de ville »).

## R6 — Lecture de la déclaration d'IA

**Décision** : `declarationIA(buffer): 'generee' | 'retouchee' | null`,
fonction pure appelée dans `televerserPhoto` **avant**
`retirerMetadonnees`. Elle parcourt seulement les conteneurs de
métadonnées :
- **JPEG** : les segments APP1 (EXIF, XMP), APP11 (JUMBF, où vit C2PA
  ([C2PA, guide d'implémentation](https://spec.c2pa.org/specifications/specifications/2.3/guidance/Guidance.html)))
  et APP13 (IPTC IIM), jusqu'au premier SOS. Elle ne lit jamais les données
  compressées de l'image.
- **PNG** : les blocs `tEXt`, `iTXt` (XMP), `eXIf` et `caBX` (C2PA). Les
  blocs compressés (`zTXt`, `iTXt` compressé) sont ignorés : on ne
  décompresse rien.
- **WebP** : les blocs `XMP `, `EXIF` et `C2PA` du conteneur RIFF.

Dans les octets de ces seuls segments, on cherche, **en respectant la
casse** :

| Terme | Conclusion |
|---|---|
| `digitalsourcetype/trainedAlgorithmicMedia` ou `trainedAlgorithmicMedia` en jeton isolé | `generee` |
| `compositeWithTrainedAlgorithmicMedia` | `retouchee` |
| `algorithmicMedia` en jeton isolé | `generee` (média produit par un algorithme, sans entraînement) |
| Bloc PNG `tEXt` `parameters` contenant `Steps:` et `Sampler:` (Automatic1111, Forge) | `generee` |
| Blocs PNG `tEXt` `prompt` **et** `workflow` (ComfyUI) | `generee` |
| Champ logiciel `NovelAI` | `generee` |

`generee` gagne sur `retouchee` quand les deux sont présents.
`compositeWithTrainedAlgorithmicMedia` contient `TrainedAlgorithmicMedia`
avec une majuscule : la recherche en respectant la casse, avec une borne de
jeton, empêche de le confondre avec `trainedAlgorithmicMedia` (test de
mutation dédié).

Les valeurs `digitalCapture`, `computationalCapture`, `compositeCapture` et
`algorithmicallyEnhanced` ne lèvent rien. Elles décrivent des photos
d'appareil, y compris celles des téléphones qui signent leurs prises en
C2PA ([vocabulaire IPTC](https://metawatch.iptc.org/dst/),
[consignes IPTC pour les médias synthétiques](https://iptc.org/news/iptc-publishes-metadata-guidance-for-ai-generated-synthetic-media/)).

**Bornes (FR-S04)** : au plus 2 Mo de métadonnées parcourues, au plus 512
segments, une longueur de segment qui dépasse le fichier arrête la lecture.
Toute exception ou borne atteinte donne `null`, et le téléversement suit son
cours.

**Pas de validation de signature C2PA** : la déclaration est faite par le
fichier lui-même. La falsifier ne sert qu'à **se** déclarer généré. La
retirer est toujours possible : l'absence ne prouve rien (cas limite
« métadonnées falsifiées »).

**Écartées** :
- `c2pa-node` ou `c2pa-rs` : binaire natif lourd, validation inutile ici, et
  une surface d'attaque en plus.
- Le décodage XMP par sharp (`metadata().xmp`) : il ne couvre pas APP11 ni
  `caBX`, et il décode l'en-tête de l'image, sans gain.
- Une recherche sur tout le fichier : un faux positif devient possible dans
  les données compressées de l'image, et le coût monte sur 5 Mo.
- Un détecteur d'images générées par un modèle : coût, faux positifs, et
  hors de l'offre gratuite.

## R7 — Photos de profil et selfie

**Décision** : `PhotoTeleversee` gagne `ia: 'generee' | 'retouchee' |
null`. `POST /api/users/photos` passe de `uploadPhoto` à `televerserPhoto`
pour l'obtenir. Les deux routes enregistrent dans `after()` :
- pour `generee`, le signal `photo_ia_generee` (fort, clé
  `photo_ia:<photoKey>`, `photoKey` renseigné) ;
- pour `retouchee`, le signal `photo_ia_retouchee` (faible, même clé).

Pour le selfie (US3, scénario 5), la carte de vérification lit les signaux
`photo_ia_*` dont le `photoKey` est celui de la demande, et affiche
« Image déclarée générée par IA » à côté du code attendu.

## R8 — Types et poids des nouveaux signaux

| Type | Force | Contexte (`TYPES_CONTEXTE`) | Clé | `extrait` |
|---|---|---|---|---|
| `pays_connexion` | faible | oui | `pays:<CC>` | le code `CC` |
| `reseau_masque` | faible | oui | `reseau:<hebergement\|vpn>` | la catégorie |
| `photo_ia_generee` | fort | non | `photo_ia:<photoKey>` | — |
| `photo_ia_retouchee` | faible | oui | `photo_ia:<photoKey>` | — |

`photo_ia_retouchee` est un indice de contexte : beaucoup de téléphones
récents proposent la gomme magique, et deux retouches ne doivent pas faire
entrer un vrai membre dans la file. Les deux types d'image partagent la clé
de la photo, donc une photo ne porte qu'un signal d'IA, le premier
enregistré. Comme un même fichier donne toujours la même conclusion, c'est
sans effet.

L'invitation automatique au selfie (spec 010) suit la règle existante :
`douteSerieux` (un fort, ou trois faibles de types différents). Une photo
générée suffit donc à inviter, ce qui est voulu. Aucun autre effet.

## R9 — Mesure de l'utilité (SC-005)

**Décision** : `scripts/agregats/indices-013.ts`, sur le modèle de
`getlibre-audit-prod-vitest`. Il compte en SQL, pour chaque nouveau type, le
nombre de comptes porteurs, puis le nombre de ceux qui ont été retirés,
bannis ou déclarés « rien à signaler ». Il n'imprime que des nombres, et
toute case inférieure à 5 s'affiche « < 5 ». Il est lancé par l'opérateur,
jamais par un agent sur la production.
