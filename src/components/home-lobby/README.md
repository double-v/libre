# Home « lobby » (épic [#243](https://github.com/double-v/libre/issues/243))

Refonte de la home publique à partir du prototype validé (Claude Design,
`templates/homepage-lobby`). Montée pour l'instant sur la route de preview
`/lobby-preview` (non indexée, 404 en prod) — le cutover sur `/` viendra à la
fin de l'épic.

Trois thèmes de landing (`data-lobby` sur le conteneur racine, switcher no-flash) :
**cartoon** (défaut, plum-black chaud) · **arcade** · **retro** (8-bit). Ils sont
distincts des skins app `libre`/`libre-warm`. Voir `lobby-theme.ts`.

## Bandeau ambiant — `AmbientBand.tsx` ([#248](https://github.com/double-v/libre/issues/248))

Bandeau décoratif entre le hero et les sections du bas : petits personnages qui
marchent (bulles de dialogue), **skyline parallax** ville/campagne sur deux
couches, et **ciel** jour/coucher/nuit choisi selon l'heure (`getSky`, `auto` par
défaut). Purement décoratif → `aria-hidden="true"` + `pointer-events: none`.

Le corps des personnages est **arrondi** (blob) en cartoon/arcade et **carré**
(radius 3px) en retro — l'identité 8-bit passe par le token `[data-lobby='retro']`.
Les couleurs sont des tokens de thème (`--lobby-accent`/`--lobby-gold`/
`--lobby-accent-strong`/`--lobby-text`), jamais de hex inline.

| Thème | Aperçu (ciel de jour) |
|---|---|
| **cartoon** | ![Bandeau ambiant — thème cartoon](./preview/ambient-cartoon.png) |
| **arcade** | ![Bandeau ambiant — thème arcade](./preview/ambient-arcade.png) |
| **retro** (corps carrés) | ![Bandeau ambiant — thème retro](./preview/ambient-retro.png) |

### Reduced-motion (garde-fou strict de l'épic)

Sous `prefers-reduced-motion: reduce`, **tout s'immobilise** : les personnages
sont figés à des positions réparties et stables (`staticLeft`), sans bulle,
skyline et étoiles statiques, aucune animation résiduelle. Le flag est détecté en
amont (`HomeLobby`, `matchMedia`) et passé en prop ; le bloc global
`prefers-reduced-motion` de `globals.css` sert de filet supplémentaire.

![Bandeau ambiant — rendu reduced-motion, personnages figés et répartis](./preview/ambient-reduced-motion.png)

> Captures régénérables : `/lobby-preview` sur les 3 thèmes, avec et sans
> `prefers-reduced-motion` (les couleurs du ciel dépendent de l'heure).
