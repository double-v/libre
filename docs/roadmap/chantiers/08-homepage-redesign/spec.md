# Chantier 08 — Home page : refonte visuelle & émotionnelle

> ⚠️ **Statut** : spéculé, à formaliser. Le ticket d'origine (#66) est un
> vœu de 3 lignes, pas une spec. Ce document capture l'intention — il
> ne sera **pas** travaillé tant que les inputs concrets (mockup, ref,
> sections, KPIs) ne sont pas rassemblés.

## Problème utilisateur

Aujourd'hui, la home est **fonctionnelle mais sans émotion** :
- Hero avec une photo Unsplash floue + 2 phrases de copy
- 6 feature cards avec emojis + numéros
- 4 "ce que Libre n'est pas" cards
- FAQ 5 questions
- 469 lignes, dense, "sobre"

**Constat** : ça passe pour un produit B2B tech. **Ça ne passe pas**
pour un produit grand public où la confiance se joue dans les 5
premières secondes. La home actuelle ne **donne pas envie** de cliquer
"Créer mon profil gratuitement".

**À clarifier avant de commencer** : qui est-ce qu'on cible en
priorité sur la home ? (cf. ticket #66 → commentaire du 10 juin)

## Périmètre hypothétique

### ✅ Probablement inclus (à confirmer)
1. **Hero redesign** : photo / illustration / animation, headline
   émotionnelle, CTA principal inchangé
2. **Ajout d'illustrations** sur les 6 feature cards (unDraw, Open
   Doodles, Storyset — tous CC0)
3. **Social proof** : témoignage user, capture écran du produit, ou
   chiffres plus visibles (ex: "0€ de CA, X users, Y discussions
   cette semaine")
4. **A/B test le hero copy** (sans toucher au SEO — le `canonical`
   et le JSON-LD doivent rester)

### ❌ Probablement hors scope
1. **Pas de photos de personnes** qui ne sont pas sur Libre
   (étranger awkward)
2. **Pas de redesign de l'app interne** (la home est un site
   marketing, l'app vit dans `(main)/`)
3. **Pas de changement SEO structurel** (le canonical `https://www.getlibre.fr/`
   et le JSON-LD `SoftwareApplication` doivent rester, cf. #65)

## Inputs manquants pour démarrer

Cf. commentaire sur #66. **Sans ces inputs, ce chantier ne peut pas
être attaqué sans risque de régression SEO ou Core Web Vitals.**

## Bénéfices attendus (chiffrés = à définir)

- ↓ Bounce rate (baseline à mesurer — pas de tracking actuellement)
- ↑ Conversion register (baseline à mesurer)
- ↑ Temps moyen sur la home

## Liens

- Ticket d'origine : #66
- PR SEO qui doit rester compatible : #65
- Chantiers connexes à ne pas casser : 01 (sécurité), 02 (La Place)
