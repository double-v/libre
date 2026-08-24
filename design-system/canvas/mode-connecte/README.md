# Mode connecté — canvas de référence (épic #273, lots #347/#348/#349)

Source versionnée du canvas Claude Design **« Libre — Mode connecté »**, validé par
l'opérateur le **2026-08-23** — le même jour que l'amendement de l'épic #273 qui fait
passer l'app connectée de `max-w-lg` (512px) à la largeur `content` (1080px).

**Canvas éditable** : https://claude.ai/code/artifact/26082d24-c4e5-4284-9b1c-ffc60358a557

C'est le **prototype validé** exigé par le premier gate de `CLAUDE.md` (« Prototype
validé pour toute nouvelle surface »). Les lots #347→#349 le **reproduisent** ; ils ne
le réinterprètent pas. En cas de désaccord entre un ticket et un artboard, c'est
l'artboard qui a été regardé sur pixels — signaler l'écart plutôt que trancher seul.

> ⚠️ Ces fichiers sont un **miroir** du canvas hébergé, comme le reste de
> `design-system/` (cf. le README parent). Le canvas reste éditable en ligne : si
> quelqu'un l'y modifie, cette copie décroche silencieusement. La resynchroniser en
> ré-exportant, pas en éditant les `.dc.html` à la main.

## Ce que le canvas tranche

Le thème rendu est **cartoon**, parce que c'est le thème *servi* du site
(`SiteConfig.currentTheme`) : Baloo 2 pour les titres, rayon de contrôle 14px,
palette corail sur crème. Les valeurs ci-dessous sont donc à lire comme des
**tokens**, jamais comme des littéraux — l'app reste theme-aware sur les 5 skins.

| Décision | Valeur au canvas | Token |
|---|---|---|
| Colonne de page | 1080px, gouttière 24px | `SiteShell width="content"` |
| Rythme vertical | `44px` en tête de page, `72px` en pied | `--spacing-section` (#282) |
| Barre du haut | 64px, sticky translucide + blur | `--nav-*` (déjà en place) |
| Sections dans la barre | **adossées à la marque**, gap 28px, actions repoussées à droite | — |
| Section active | pastille pleine (fond `--sunken`, texte `--coral`), icône + libellé | — |
| Grille de liste | `repeat(3, minmax(0,1fr))`, gap 20px | `gap-grid` (#282) |
| Carte de liste | ratio **4/5**, rayon de carte, ombre corail | `rounded-card`, `--elev-soft` |
| Fil de conversation | largeur de lecture dans la colonne 1080 | `SiteShell width="reading"` |

Deux points où le canvas est en-dessous du plancher d'accessibilité du repo, et où
**le code garde le plancher** : les entrées de section (40px au canvas) et les
avatars de la barre montent à **44px** de cible tactile, la pastille restant
visuellement à 40px.

## Les artboards

### Desktop (`page: desktop`)

| Fichier | Écran | Lot |
|---|---|---|
| `Main.dc.html` | Découvrir — Pour toi | **#347** fondations |
| `Proximite.dc.html` | Découvrir — À proximité, **en sombre** | #347 / #348 |
| `Croisements.dc.html` | Découvrir — Croisements | #348 |
| `Lancement.dc.html` | Découvrir — **état de lancement** | #348 + #346 |
| `Messages.dc.html` | Liste de conversations | #349 |
| `Conversation.dc.html` | Fil + composeur | #349 (et #339) |
| `LaPlace.dc.html` | La Place — polish | #348 |
| `Profil.dc.html` | Mon profil | #349 |
| `Parametres.dc.html` | Paramètres | #349 |

### Mobile (`page: mobile`)

`MobileDecouvrir` · `MobileLaPlace` · `MobileConversation` — la preuve que **rien ne
bouge sous `md`** : colonne unique, bottom tab bar, safe-area. Pas de fausse barre
d'état ni de faux clavier : sur un vrai téléphone, le système les dessine par-dessus.

### Système (`page: systeme`)

`Systeme.dc.html` — l'échelle de largeurs, la table de parité home ↔ app et la
palette cartoon clair/sombre. C'est ce tableau qui a cadré **#282** : ce qui manquait
n'était pas la palette (déjà là) mais la générosité de mise en page, plus une ombre
deux fois trop plate. Calibrage, pas réécriture.

## Annotations portées par le canvas

- **#347** — colonne 1080, sections dans `SiteNav` dès `md`, tab bar masquée en desktop.
- **#348 + #346** — le vide est le cas nominal : les vignettes en pointillés complètent
  la rangée au lieu de n'apparaître qu'à zéro profil, et ne sont **jamais** confondables
  avec une personne. La carte de parrainage est unique et vit en fin de grille.
- **#349** — le fil reste à largeur de lecture dans la colonne 1080 ; le composeur est
  ancré au fil, pas à la fenêtre ; **#339 se corrige avant ou avec** ce lot.
- **La Place** — le reset quotidien devient un rituel affiché (compte à rebours) au lieu
  d'une disparition subie. Aucune classe `.lobby-*` : le panneau vitré passe par le
  token sémantique livré en #282.
