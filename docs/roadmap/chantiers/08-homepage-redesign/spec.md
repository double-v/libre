# Chantier 08 — Home page : refonte visuelle & émotionnelle

> ✅ **Statut** : spec validée (inputs rassemblés 2026-06-10), prête à décomposer en tickets.
>
> Ticket d'origine : [#66](https://github.com/double-v/libre/issues/66)

## 1. Vision

La home doit **donner envie de cliquer "Créer mon profil gratuitement"** dans les 5 premières secondes. Aujourd'hui elle est fonctionnelle mais sans émotion — on dirait un produit B2B tech, pas un produit grand public chaleureux.

**Ambiance retenue** : **fun / punchy** (référence : Wizz, Locket) — gros emoji, couleurs vives, micro-copy drôle, scroll rapide vers register.

**Cohérence palette** : on garde la palette actuelle (coral `#E8634A` / blush / sand / terracotta) et on densifie le côté "vivant" via animations CSS subtiles, illustrations vectorielles et photos lifestyle.

## 2. Périmètre

**Inclus** :
1. **Home complète** : nav, hero, 3 sections intermédiaires, FAQ, footer
2. **Page secondaire `/manifesto`** (ISR pur) : cohérence narrative du ton fun/punchy
3. **Illustrations vectorielles** (CC0, unDraw / Open Doodles / Storyset) en accent subtil
4. **Photos Pexels CC0** lifestyle (sans visages) en dominante
5. **Animations CSS** (entrée, hover, micro-interactions) — pas de JS lourd

**Hors scope** :
1. Pas de redesign de l'app interne (`(main)/`)
2. Pas de changement SEO structurel (`canonical` + JSON-LD `SoftwareApplication` restent intacts, cf. #65)
3. Pas de photos de personnes (visibles ou non) — site de rencontre, photos d'inconnus = awkward
4. Pas d'auth ou de tracking analytics nouveau (utiliser ce qui existe : Plausible si branché, sinon rien)

## 3. Stratégie de rendu

| Page | Rendering | Pourquoi |
|---|---|---|
| `/` (home) | `force-dynamic` (état actuel) | Compteur users live, cohérence avec le reste du site, zéro risque |
| `/manifesto` | **ISR pur** (`revalidate = 3600`) | Contenu statique, boost SEO Google Images sans complication |

Découplage propre : la home garde sa DB read (compteur), la /manifesto devient un asset SEO pur.

## 4. Sourcing visuel

**Mix retenu** (savant mélange, dominante photos) :
- **70% photos Pexels CC0** lifestyle sans visages : mains qui se serrent, terrasses de café, couchers de soleil, livres ouverts, balades. Format paysage 16:9 ou 4:3, ≤ 100 KB après optimisation.
- **30% illustrations vectorielles** (unDraw / Open Doodles / Storyset) en accent : feature cards, séparateurs de section, callouts.
- **Gros emoji natifs** conservés pour les micro-touches de fun (hero CTA, FAQ items).

**Sources** :
- Pexels : https://www.pexels.com/license/ (CC0-like, attribution appreciated)
- unDraw : https://undraw.co/illustrations (MIT, recolorable)
- Open Doodles : https://www.opendoodles.com/ (CC BY 4.0)
- Storyset : https://storyset.com/ (free pour usage non-commercial avec attribution)

## 5. KPIs (cible 60 jours post-deploy)

| Métrique | Baseline | Cible | Pondération |
|---|---|---|---|
| **Taux de conversion register** (visiteur → compte créé) | à mesurer J0 | **+20%** | 50% |
| **Scroll depth** (% visiteurs qui atteignent la FAQ) | à mesurer J0 | **+25%** | 30% |
| **Bounce rate** (sortie < 30s) | à mesurer J0 | **-15%** | 20% |

**Mesure** :
- ❌ **Zéro tracking** (décision 2026-06-10, choix éthique) → pas de baseline mesurable scientifiquement
- ✅ **Mesures qualitatives** : retours utilisateurs sur les réseaux (mastodon surtout), volume de tickets support, témoignages spontanés, observations directes en navigation privée
- **Porte de succès** (subjective) : à J+60, est-ce que la home "donne envie de cliquer Créer mon profil" ? Réponse par triangulation des retours quali, pas par un dashboard.

## 6. Structure cible de la home (mockup ASCII)

```
┌─────────────────────────────────────────────────────────────┐
│  NAV : Libre  [Comment ça marche] [FAQ] [Manifesto] [CTA]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  HERO (force-dynamic, photo Pexels lifestyle floutée)       │
│  ┌─────────────────────────┬─────────────────────────────┐  │
│  │ Rencontrer devrait      │  📸 Photo 4:3               │  │
│  │ pas coûter un rond. 🫶 │  (mains qui se serrent,      │  │
│  │                          │   café en arrière-plan)     │  │
│  │ 100% gratuit, 0 pub,    │                              │  │
│  │ 0 revente de data.      │                              │  │
│  │                          │                              │  │
│  │ [Créer mon profil] 🔥  │                              │  │
│  │ 1 247 personnes          │                              │  │
│  │  ont déjà rejoint        │                              │  │
│  └─────────────────────────┴─────────────────────────────┘  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  SECTION 1 — "Comment ça marche" (3 étapes, illustrations)  │
│  1️⃣ Tu crées ton profil      2️⃣ Tu croises des gens      3️⃣ Tu tchates (E2E 🔒) │
│  [illus unDraw]              [illus unDraw]              [illus unDraw]   │
├─────────────────────────────────────────────────────────────┤
│  SECTION 2 — "Pourquoi Libre" (4 cards illustrées)          │
│  🆓 Gratuit vraiment    🔒 Messages chiffrés E2E            │
│  🛡️ Modération humaine 🚫 Zéro pub, zéro revente            │
│  [Storyset accent]      [Storyset accent]                    │
├─────────────────────────────────────────────────────────────┤
│  SECTION 3 — "Ce que Libre n'est PAS" (4否定, ton fun)       │
│  ❌ Pas un algo qui te vend   ❌ Pas un swipe à l'infini     │
│  ❌ Pas un boost à 4,99€     ❌ Pas un piège à data         │
├─────────────────────────────────────────────────────────────┤
│  FAQ (5 questions, accordion)                                │
│  ▸ Est-ce vraiment gratuit ?                                  │
│  ▸ Comment gagnez-vous de l'argent ?                         │
│  ▸ Mes messages sont-ils vraiment privés ?                   │
│  ▸ Y a-t-il des faux profils ?                               │
│  ▸ Quelles différences avec Tinder ?                         │
├─────────────────────────────────────────────────────────────┤
│  CTA FINAL (pleine largeur, gros emoji)                      │
│  Prêt·e à rencontrer sans payer ? 🚀                         │
│  [Créer mon profil gratuitement]                              │
├─────────────────────────────────────────────────────────────┤
│  FOOTER (légal, contact, mastodon, etc.)                      │
└─────────────────────────────────────────────────────────────┘
```

## 7. Structure cible de /manifesto (ISR)

Page longue, ton fun/punchy assumé, ~ 600-800 mots :

1. **Hero court** : "Notre manifesto" + 1 phrase choc
2. **Section "On est libres de"** (3-4 engagements positifs)
3. **Section "On refuse de"** (3-4 refus, ton cash)
4. **Section "Comment on finance"** (dons, transparence)
5. **CTA register** + lien retour home

Rendu ISR `revalidate = 3600` — pas de DB read, pas de compteur, contenu 100% statique dans le code.

## 8. Décomposition en tickets

Tickets ordonnés pour limiter les régressions (chaque PR = 1 chose testable, Vercel build vert à chaque étape) :

| # | Ticket | Taille | Dépendances | Description |
|---|---|---|---|---|
**Décision 2026-06-10 (post-spec)** : **zéro tracking** (choix éthique de Skoff).
- T1 (Plausible) est **supprimé**
- La baseline KPIs ne peut **pas** être mesurée avec des outils maison → les cibles chiffrées (conversion +20%, scroll +25%, bounce -15%) restent comme **objectifs à dire d'expert**, pas comme mesures scientifiques
- Le critère "score pondéré ≥ +15% à J+60" devient **subjectif** : ressenti utilisateur, retours quali sur les réseaux, volume de demandes au support, témoignages directs
- C'est un trade-off assumé, à reverifier si on ajoute un jour un outil de mesure (Plausible auto-hébergé, Vercel Analytics opt-in, ou logs serveur anonymisés)

| # | Ticket | Taille | Dépendances | Description |
|---|---|---|---|---|
| 1 | **#T1 — Manifeste (ISR pur) + lien nav** | M | — | Créer `/manifesto` (ISR `revalidate=3600`), ajouter lien dans nav, route `/manifesto` |
| 2 | **#T2 — Hero redesign (fun/punchy + photo lifestyle + animations)** | L | — | Refonte du hero uniquement : photo Pexels, micro-copy drôle, animations CSS, compteur users live conservé |
| 3 | **#T3 — Sections 1+2 (Comment ça marche + Pourquoi Libre) avec illustrations unDraw** | L | T2 | Remplacer emojis par illustrations vectorielles, garder structure 3+4 cards |
| 4 | **#T4 — Section 3+CTA final (Ce que Libre n'est PAS + gros CTA)** | M | T3 | Refondre "ce que Libre n'est pas" en ton fun cash, CTA final pleine largeur |
| 5 | **#T5 — FAQ redesign (accordions + micro-copy) + footer** | S | T4 | FAQ en accordions (déjà présents dans Tailwind), footer avec mastodon + contact |

**Ordre choisi** : home du haut vers le bas (hero → sections → CTA → footer) + manifesto en parallèle (T2) pour découpler le risque SEO.

**Estimation totale** : ~1 semaine de boulot (4-6 jours selon vitesse), chantier pré-découpé pour pouvoir s'arrêter / reprendre proprement entre les tickets.

## 9. Garde-fous (à ne PAS casser)

- **SEO** : `canonical: https://www.getlibre.fr/` + JSON-LD `SoftwareApplication` (cf. PR #65)
- **Accessibility** : skip-link présent, contraste AA minimum, navigation clavier OK, `prefers-reduced-motion` respecté sur les animations
- **Performance** : LCP ≤ 2.5s sur 4G, CLS ≤ 0.1, photos optimisées via `next/image` + `priority` sur le hero uniquement
- **Auth** : ne PAS toucher `src/proxy.ts` ni le flow `next-auth` (chantier 01 séparé)
- **Theming** : respecter `data-theme={theme.id}` (cf. chantier chantier-theme PR 1+2 mergés #87, #90)

## 10. Hors-scope explicite (rappel)

- Pas d'A/B test infra
- Pas de CMS ou de contenu dynamique hors compteur
- Pas de redesign de l'app (la home est marketing, l'app vit dans `(main)/`)
- **Pas de tracking du tout** (zéro analytics, zéro cookies, zéro logs serveur personnalisés)

## 11. Liens

- Ticket d'origine : [#66](https://github.com/double-v/libre/issues/66)
- PR SEO compatible : #65
- Chantiers connexes à ne pas casser : 01 (sécurité), 02 (La Place)
- Chantier theme (couleurs overriddables) : chantier-theme PR 1+2 mergés
- Plan détaillé d'implémentation : `docs/roadmap/chantiers/08-homepage-redesign/plan.md` (à créer post-validation spec)

---

**Décisions prises le 2026-06-10 avec Skoff** :
- Ambiance : fun / punchy
- Sourcing : mix 70% photos Pexels + 30% illustrations vectorielles
- Périmètre : home complète + /manifesto
- Rendu : force-dynamic home + ISR /manifesto
- KPIs : mix 50/30/20 (conversion / scroll / bounce)
