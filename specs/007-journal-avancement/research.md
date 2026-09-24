# Recherche — Où en est Libre (spec 007)

Relevés faits dans le code le 2026-09-24 ; chaque décision cite ce qu'elle
réutilise.

## R1 — Garantir que la page publique ne lit jamais la session (FR-004)

- **Constat** : le layout racine (`src/app/layout.tsx`) ne lit ni cookies ni
  en-têtes ; le thème du site vient de la base (`site-theme-server.ts`) sans
  cookie. `/manifesto` est déjà une page ISR (`revalidate = 3600`) dans le shell
  public. Le proxy ne touche pas aux chemins publics (seuls
  `PROTECTED_PREFIXES` redirigent).
- **Décision** : `src/app/journal/page.tsx` et `src/app/journal/[slug]/page.tsx`
  déclarent `export const dynamic = 'force-static'` et `revalidate = 3600`. En
  `force-static`, Next.js rend `cookies()`/`headers()` vides : même une lecture
  accidentelle de session ne peut pas personnaliser le HTML. Une garde de test
  (`src/__tests__/journal-sans-session.test.ts`) lit les sources de
  `src/app/journal/**` et échoue sur `getServerSession`, `cookies(`,
  `headers(`, `useSession` ou l'absence de `force-static`.
- **Fraîcheur** : publication, modification et dépublication appellent
  `revalidatePath('/journal')` et `revalidatePath('/journal/<slug>')` ; le
  `revalidate` horaire n'est qu'un filet.
- **Alternatives écartées** : rendu dynamique + `Cache-Control: private` (fragile,
  le moindre CDN mal réglé mélange les réponses) ; route séparée pour les
  connectés (autorisée par #350, inutile tant que #352 n'existe pas).

## R2 — Texte restreint sans HTML brut (FR-009)

- **Constat** : aucune bibliothèque markdown n'est installée
  (`package.json`) ; ajouter une dépendance coûte cher ici (lock plus récent que
  la machine, cf. mémoire projet « lock npm »).
- **Décision** : analyseur maison minimal `src/lib/journal/texte.ts` →
  arbre typé (paragraphe, liste à puces, liste numérotée, lien, gras,
  italique), rendu par un composant React qui n'utilise **jamais**
  `dangerouslySetInnerHTML` : React échappe tout texte. Syntaxe markdown
  réduite : ligne vide = paragraphe, `- ` / `1. ` = listes, `**gras**`,
  `*italique*`, `[texte](url)`. Liens : `https://` ou chemin interne `/…`
  seulement ; tout autre schéma (`javascript:`, `data:`) est rendu en texte.
  Liens externes : `rel="noopener noreferrer nofollow"`.
- **Alternatives écartées** : `react-markdown` + `rehype-sanitize` (dépendances
  lourdes pour cinq constructions) ; éditeur riche (hors MVP).

## R3 — Garde-fous éditoriaux (FR-014 → FR-020)

- **Décision** : les règles vivent dans un seul module
  `src/lib/journal/regles.ts` (identifiant, énoncé, exemple à éviter,
  reformulation, motifs, bloquante ou non), lu **à la fois** par l'écran (texte
  affiché) et par le contrôle (`src/lib/journal/garde-fous.ts`, fonction pure
  `controler(titre, corps) → Alerte[]`). Même source, même vérité : le patron de
  `REGLES_RETENTION` (#427).
- **Motifs** : e-mail et téléphone français/international → **bloquants** ;
  chemins `/api/…` et noms de fichiers à extension de code, `@identifiant`,
  lien hors liste blanche (le domaine du site), nom de paquet ou version
  (`v1.2`, `x.y.z`), vocabulaire de détection/modération (liste courte :
  seuil, signal, score, détection, regex, mot-clé, faux positif, bannissement…),
  chiffre à proximité de « banni/signalement/compte supprimé », chiffre
  communautaire exact (nombre ≥ 10 non rond près d'« inscrit·e·s/membres ») →
  **levables**.
- **Levée par extrait** (FR-019) : chaque alerte porte une `empreinte` =
  SHA-256 de `regle + extrait` (tronquée). Le client renvoie les empreintes
  levées ; le **serveur recontrôle** et refuse (422) si une alerte bloquante
  subsiste, si une empreinte levable manque, ou si `reglesRelues` n'est pas
  `true`. Rien n'est stocké hors du journal de modération (identifiants de
  règles levées, jamais les extraits — FR-012).
- **Jeu de référence** (SC-004) : `src/lib/journal/__tests__/garde-fous.test.ts`
  porte un exemple positif et un négatif par motif, plus les trois premières
  publications prévues (SC-007) qui ne doivent déclencher aucune alerte
  bloquante.

## R4 — Interrupteur « coupé par défaut » (FR-023)

- **Constat** : `SiteConfig.featuresDisabled` stocke ce qui est **coupé** ;
  vide = tout activé (`featuresDepuisConfig`), et `useFeatures` est optimiste
  (seul un `false` explicite coupe). Une fonctionnalité coupée par défaut ne
  peut pas s'y exprimer : l'absence vaut « activée ».
- **Décision** : `FEATURES` gagne une valeur par défaut par clé
  (`DEFAUTS: Record<Feature, boolean>`, `journal_comments: false`) et
  `SiteConfig` une colonne additive `featuresEnabled String[] @default([])`
  (sans `@map`, cf. mémoire « SiteConfig @map drift »). Règle :
  activée = `DEFAUTS[f] ? !disabled.has(f) : enabled.has(f)`. L'écriture
  (`PUT /api/admin/features`) range chaque clé dans la bonne colonne. Côté
  client, la normalisation part de `DEFAUTS` : pour une clé coupée par défaut,
  seul un `true` explicite l'active (optimisme conservé pour les autres).
- **Migration** : additive, écrite à la main
  (`prisma/migrations/2026092510xxxx_features_enabled/`), aucune donnée à
  reprendre : une colonne vide = tout ce qui est coupé par défaut reste coupé.
- **Portée MVP** : l'interrupteur apparaît dans `/admin/features` avec une
  copie « à venir » ; `gardeFeature('journal_comments')` existe pour que #352
  n'ait qu'à l'appeler. Les pages `/journal` ne consultent pas l'interrupteur
  (rien à masquer tant que #352 n'existe pas).
- **Alternatives écartées** : jeton sentinelle dans `featuresDisabled`
  (illisible, casse la normalisation) ; inverser la sémantique de toute la
  colonne (migration de données sur la prod, risque sur les trois
  interrupteurs existants).

## R5 — Journal de modération

- `ModerationLog.targetUserId` est obligatoire : même convention que
  `SET_FEATURES` et `RUN_RETENTION`, la cible est l'admin lui-même. Actions
  `PUBLISH_POST`, `UPDATE_POST`, `UNPUBLISH_POST`, `DELETE_DRAFT` ;
  `reason` = `post:<id>` + ` ; levees: r3,r5` le cas échéant. Aucune table de
  libellés dans `/admin/logs` (l'action s'affiche brute).

## R6 — Adresse, sitemap, points d'entrée

- Adresse `/journal` et `/journal/<slug>` ; slug dérivé du titre à la première
  publication (minuscules, sans accents, tirets), **figé ensuite**, suffixe
  `-2`… en cas de collision.
- `src/app/sitemap.ts` devient asynchrone et ajoute `/journal` et chaque
  publication publiée (`lastModified` = dernière modification publiée).
- Points d'entrée : lien « Journal » dans `SiteNav` variante guest (à côté de
  « Manifeste ») ; côté connecté, une entrée dans Paramètres (emplacement exact
  au prototype). Pas de badge (FR-022, `no-unread-count.test.ts` reste vert).

## R7 — Découpage en PR

- Mémoire opérateur « branche tampon par lot » : un lot de stories = une PR = un
  déploiement. Le MVP entier livre **#351** en une PR, les user stories en
  commits/étapes successives. Pas d'issue par story pour ce lot (dérogation
  assumée au principe VI, déjà pratiquée en #397).
