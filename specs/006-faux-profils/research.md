# Recherche — Détection des faux profils (spec 006)

Mesures faites le 2026-09-24 dans un bac à sable isolé (scratchpad), sans
toucher au lock du dépôt.

## R1 — Lire le texte incrusté sur une photo, chez nous

- **Décision** : `tesseract.js` 7 (WASM, Node), modèle `eng` embarqué via le
  paquet npm `@tesseract.js-data/eng` — aucun appel réseau à l'exécution. Une
  seule passe sur l'image telle quelle, lancée dans `after()` après l'ajout.
- **Mesures** : initialisation ≈ 0,3–0,5 s, lecture ≈ 0,15–0,35 s par photo
  1080×1350. `Telegram : @lola_privee75` en surimpression → lu à l'identique.
  `06 12 34 56 78` en italique → `061234 56 78` (la détection doit tolérer les
  espaces). Texte petit et incliné de 8° → rien de lu.
- **Prétraitement essayé et écarté** : niveaux de gris + contraste + ×2 + seuil
  (et version inversée) → ×10 sur le temps (≈ 3 s), bruit parasite, aucun gain
  sur le cas incliné. Le texte illisible reste couvert par la recherche inversée
  manuelle (US1) — cas limite accepté par la spec.
- **Alternatives** : Google Vision (écarté : sous-traitant hors UE, hors
  périmètre) ; OCR côté navigateur (écarté : contournable par le fraudeur).
- **Coût** : `tesseract.js-core` pèse 44 Mo décompressé (plusieurs variantes
  WASM, une seule chargée) ; le modèle `eng` ≈ 5 Mo. Sous la limite de taille
  d'une fonction Vercel.

## R2 — Empreinte de ressemblance d'une photo

- **Décision** : dHash 64 bits calculé avec `sharp` (déjà en dépendance) :
  niveaux de gris, 9×8, comparaison de pixels voisins. Distance de Hamming
  **≤ 8** = même photo.
- **Mesures** (portrait synthétique 1080×1350) : recompression + réduction à
  640 px → distance 0 ; recadrage 5 % → 1 ; recadrage 10 % → 5 ; image
  différente de composition proche → 17.
- **Stockage/comparaison** : entier 64 bits signé en base ; comparaison en
  mémoire contre toutes les empreintes (quelques centaines au lancement).
  Au-delà de ~50 000, passer à `bit_count(a # b)` côté SQL — hors périmètre.
- **Alternatives** : pHash (DCT) plus robuste aux retouches de couleur, mais
  une dépendance de plus pour un gain non mesuré ici ; empreintes de modèle
  (embeddings) écartées (lourdes, proches de la biométrie).

## R3 — Repérer un contact externe dans un texte

- **Décision** : module pur `detecterContact(texte)` → liste de
  `{ type, extrait, force }`. Normalisation avant recherche : minuscules,
  accents retirés, homoglyphes simples (`0→o`, `@` isolé), espaces et points
  répétés compactés pour les motifs de lien (`t . m e` → `t.me`).
- **Motifs forts** : `@identifiant` (3+ caractères), `t.me/…`, `wa.me/…`,
  `snapchat.com/add/…`, `onlyfans.com/…`, `instagram.com/…`, nom de
  messagerie **suivi** d'un identifiant (« snap: lolaa.vip », « telegram
  lola75 »), numéro de téléphone français (`0[1-9]` + 8 chiffres, `+33`,
  séparateurs libres) ou international (`+` + 8 à 15 chiffres).
- **Motifs faibles** : nom de messagerie seul (« je n'ai pas Telegram »),
  adresse e-mail.
- **À l'écriture** (FR-020) : seuls les motifs **forts** refusent
  l'enregistrement ; le motif faible lève un signal faible, sans bloquer.

## R4 — Forme d'une photo « récupérée » (indice faible)

- **Décision** : lue sur le fichier reçu **avant** tout traitement :
  dimensions parmi les formats de sortie courants des réseaux (côté long 1080,
  1350, 1920, 640, 750 avec un côté court de 1080/640/750) **et** absence totale
  d'EXIF. Rien d'autre n'est conservé que le booléen.
- **Constat annexe (sécurité)** : aucun code ne retire aujourd'hui les
  métadonnées EXIF des photos téléversées ; une photo de téléphone peut porter
  la position GPS de sa prise de vue, servie aux autres membres. Issue dédiée,
  hors de cette spec, mais l'indice R4 doit être lu **avant** ce nettoyage le
  jour où il existera.

## R5 — Ajouter des dépendances sans casser le lock

- **Contrainte** (mémoire du projet) : le lock vient d'un npm 11 (champs
  `libc` sur les binaires natifs) ; la machine a npm 10.9.8, qui les efface à
  toute régénération.
- **Décision** : greffer au lock, avec `jq`, les entrées exactes produites dans
  un bac à sable (`tesseract.js`, `tesseract.js-core`, `wasm-feature-detect`,
  `is-url`, `bmp-js`, `idb-keyval`, `zlibjs`, `regenerator-runtime`,
  `opencollective-postinstall`, `@tesseract.js-data/eng` ; `node-fetch` 2.7.0 est
  déjà présent) et déclarer les versions à la main dans `package.json`. Ce sont
  des paquets JS/WASM purs : aucun champ `libc` en jeu. Vérifier par
  `npm ci --dry-run` puis en CI.

## R6 — Exécuter l'analyse sans ralentir le membre

- **Décision** : `after()` (patron déjà utilisé pour le push, spec 003) sur
  l'ajout de photo ; le tampon de l'image est capturé par la fermeture, rien
  n'est relu depuis R2. Best-effort : un échec est journalisé sans PII et ne
  change jamais la réponse.
- **Rattrapage** (FR-011) : action admin « Analyser les profils existants »,
  par lots de 10 profils par appel (photos relues depuis R2), reprenable — pas
  de cron (plan Vercel, cf. #427).

## R7 — Recherche inversée en un clic (US1)

- **Décision** : route admin qui journalise puis redirige (302) vers le moteur
  avec une URL R2 **signée 15 min** de l'original :
  - Google Lens : `https://lens.google.com/uploadbyurl?url=<url>`
  - Yandex : `https://yandex.com/images/search?rpt=imageview&url=<url>`
  - TinEye : `https://tineye.com/search?url=<url>`
- Le moteur télécharge la photo pendant la validité de l'URL ; au-delà, le lien
  est mort. C'est le seul chemin par lequel une photo sort vers un tiers, et il
  exige un geste de modérateur (FR-004).

## R8 — Mise en retrait

- **Décision** : `User.retraitAt` (nullable). Toute requête qui liste des
  profils à d'autres membres filtre déjà `isBanned` — on y ajoute
  `retraitAt: null` via un seul fragment partagé (`visiblePourAutrui`), et un
  test garde la liste des routes (patron de `features-gardes.test.ts`). Envoi
  de message et like refusés au membre en retrait. L'approbation du badge
  (#436) remet `retraitAt` à `null`.
