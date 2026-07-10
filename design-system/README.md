# Libre — Design System (previews Claude Design)

Previews HTML statiques et autonomes des composants du Design System Libre,
destinées à la galerie **claude.ai/design** (projet « Libre — Design System »).

## À quoi ça sert

- **Catalogue visuel** : voir tout le kit rendu d'un coup, **light + dark côte à côte**,
  ce qu'aucune page de l'app ne montre. C'est là qu'on repère les dérives de tokens
  (nuances de coral, spacing, contraste) invisibles composant par composant.
- **Contexte design pour les agents** : rend le Design System *lisible* par Claude,
  pour que l'UI générée colle au système au lieu de dériver de `DESIGN.md`.

> ⚠️ Ce ne sont **pas** les vrais composants React : ce sont des miroirs statiques.
> Quand un composant de `src/components/ui/` change, mettre la preview à jour ici.
> Ce n'est utile que si on l'entretient.

## Contenu (`components/`)

| Preview | Miroir de | Groupe |
|---|---|---|
| `button.html` | `src/components/ui/Button.tsx` | Composants |
| `input.html` | `src/components/ui/Input.tsx` | Composants |
| `card.html` | `src/components/ui/Card.tsx` | Composants |
| `tag.html` | `src/components/ui/Tag.tsx` | Composants |
| `toast.html` | `src/components/ui/Toast.tsx` | Composants |
| `alert.html` | `src/components/ui/Alert.tsx` | Composants |
| `avatar.html` | pattern avatar (`DESIGN.md`) | Composants |
| `nav.html` | `src/app/(main)/layout.tsx` (bottom tab bar) | Navigation |

## Contenu (`templates/`)

| Preview | Miroir de | Groupe |
|---|---|---|
| `home-hero.html` | `src/app/page.tsx` (hero) + `src/components/RotatingWord.tsx` | Pages |

> Le prototype `templates/homepage-lobby/*` côté projet Claude Design est **rejeté**
> (refs gamer, viole les anti-références `PRODUCT.md`) — à retirer/remplacer, cf. issue #238.

## Conventions

- **Tokens uniquement**, valeurs alignées sur le bloc `@theme` de
  `src/app/globals.css` (source de vérité) et `DESIGN.md`. Pas de couleur inventée.
- Chaque fichier commence par un marqueur `<!-- @dsCard group="…" name="…" subtitle="…" -->`
  en **première ligne** : c'est ce qui crée la carte dans la galerie.
- Chaque preview montre light **et** dark, et respecte `prefers-reduced-motion`.

## Resynchroniser vers claude.ai/design

Projet : **Libre — Design System** — `projectId` `1676fe75-ed4d-44df-bc1c-5a8c2443e6d2`.

Via Claude Code (skill `/design-sync` ou l'outil `DesignSync`), en poussant
`components/*.html` depuis ce dossier. Sync **incrémental**, un composant à la fois,
jamais un remplacement en bloc.
