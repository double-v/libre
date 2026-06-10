# Profile Page Redesign — Design Spec

**Date**: 2026-05-28
**Status**: Superseded by issue #79 (2026-06-10)

> Cette spec ne couvrait que les correctifs **DESIGN.md / design system** (dark mode, surface tokens, contraste WCAG, touch target 44px, extraction de composants). Elle a été exécutée — voir les commits référencés dans le plan associé `2026-05-28-profile-redesign.md`. La suite de la refonte UX (vitrine personnelle vs formulaire, photo hero, aperçu public, principes Tinder/Bumble/Hinge) est traitée dans l'issue **#79**, qui étend le périmètre au-delà des simples correctifs de tokens.

## Problem

The profile page violates DESIGN.md on multiple points:
- "Modifier" button is invisible tiny text (`text-xs text-gray-600`), violates 44px touch target
- Zero dark mode support — sections, inputs, tags, cards all lack `dark:` variants
- Input focus uses `focus:border-black` instead of coral focus rings
- No surface contrast between sections (all same `bg-white border-gray-200`)
- Cards use `rounded-lg` instead of DESIGN.md `rounded-xl`
- Practices section uses `bg-purple-50/30` — purple doesn't exist in DESIGN.md tokens
- ChipList tags inconsistent with DESIGN.md tag-chip spec

## Design

### Extracted Components

**`ProfileSection`** — Reusable card wrapper for each profile section.
- Props: `title`, `onEdit?`, `editing`, `surface?` (`'white' | 'blush' | 'sand'`), `children`
- Background: `bg-white` default, `bg-blush` for bio, `bg-sand` for practices
- Border: `border-gray-200 dark:border-gray-700`
- Radius: `rounded-xl`
- Padding: `p-4 sm:p-5`
- Header: title `text-lg font-semibold text-gray-900 dark:text-gray-100` + pencil icon (44px touch target)
- Pencil icon hidden when editing; edit actions shown instead

**`ProfileField`** — Label/value pair for read mode.
- Props: `label`, `children`, `empty?` (shows "Non renseigné" italic when no value)
- Semantic `<dt>`/`<dd>` markup
- Label: `text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400`
- Value: `text-sm text-gray-900 dark:text-gray-100`

**`EditActions`** — Existing component, improved.
- Save button: `bg-coral hover:bg-terracotta` (was `bg-terracotta`)
- Cancel button: `border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700`
- Focus rings: coral

**`ChipList`** — Existing component, improved.
- Default tags: `bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded-full px-2.5 py-0.5 text-xs font-medium`
- Practices tags: `bg-sand/60 text-coral-dark dark:bg-coral/20 dark:text-coral-light`

**`ThemeToggle`** — Sticky dark/light mode switch.
- Fixed position: bottom-right, above bottom nav (accounting for `pb-16`)
- Small pill button: `h-10 w-10 rounded-full bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700`
- Sun/moon SVG icon, `text-gray-600 dark:text-gray-300`
- Uses `prefers-color-scheme` detection + localStorage toggle
- Applies `dark` class to `<html>` element

### Surface Hierarchy

| Section | Surface | DESIGN.md Token |
|---|---|---|
| Identite | white | white |
| Bio | blush `#FDF0ED` | blush |
| Orientation & Relations | white | white |
| Centres d'interet | white | white |
| Pratiques & Preferences | sand `#F5E6D8` + `border-coral/20` | sand |
| Photos | white | white |
| Preferences de recherche | blush | blush |
| Liens sociaux | white | white |
| Conseils vie privee | gray-50 / dark:gray-800 | neutral info |
| Zone dangereuse | red-50 / dark:red-900/20 | semantic error |

### Input Styling

All inputs unified to:
- `border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`
- `focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral`
- Placeholder: `placeholder:text-gray-400 dark:placeholder:text-gray-500`

### Pencil Icon

Inline SVG (no external dependency), HeroIcons pencil-square path:
```
M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z
```
- Wrapper button: `h-11 w-11 flex items-center justify-center rounded-full hover:bg-blush dark:hover:bg-gray-700 transition-colors`
- Icon: `h-5 w-5 text-gray-400 hover:text-coral`

### Dark Mode

All surfaces receive `dark:` variants:
- Page: `bg-gray-50 dark:bg-gray-900`
- Cards: `bg-white dark:bg-gray-800`
- Blush surfaces: `bg-blush dark:bg-coral/10`
- Sand surfaces: `bg-sand dark:bg-coral-dark/20`
- All text, borders, inputs, tags, buttons get proper `dark:` tokens

### ProfileCompleteness

- Surface: `bg-blush dark:bg-coral/10`
- "ici" link becomes coral underline button

### ThemeToggle Placement

- `fixed bottom-20 right-4 z-40` (above bottom nav which is at bottom-0 with py-2 ≈ 64px height)
- Discrete: small circle, shadow, no label

## Files to Create/Modify

1. `src/components/ProfileSection.tsx` — new
2. `src/components/ProfileField.tsx` — new
3. `src/components/ThemeToggle.tsx` — new
4. `src/components/ProfileCompleteness.tsx` — update dark mode
5. `src/components/TagButton.tsx` — update dark mode
6. `src/components/ChipList.tsx` — extract from profile page, update dark mode + pill radius
7. `src/app/(main)/profile/page.tsx` — major rewrite using extracted components
8. `src/app/(main)/layout.tsx` — add ThemeToggle