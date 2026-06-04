@AGENTS.md

## Design Context

Avant toute création ou refacto UI/UX, lire dans l'ordre :
1. `PRODUCT.md` (registre, personnalité, anti-références, principes)
2. `DESIGN.md` (tokens couleur, typo, motion, composants, responsive)

Règles impératives :
- Aucun composant UI ne doit être créé en dehors de la `Component Library` de DESIGN.md.
- Toute valeur inline (`#E8634A`, `bg-gray-200`, etc.) est interdite. Toujours passer par les tokens (`text-coral`, `bg-blush`, etc.).
- Toute animation doit avoir un équivalent `@media (prefers-reduced-motion: reduce)`.
- Le dark mode est un vrai design, pas un invert. Toujours tester les deux.
- Copy en français, jamais d'anglais dans l'UI.

Si un nouveau besoin design sort de l'ordinaire, mettre à jour `DESIGN.md` AVANT de coder.

## Repository

The canonical remote is `libre` (https://github.com/double-v/libre.git). Always push to `libre`, not `origin` (which points to an old repo URL).
