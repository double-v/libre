# Principes de décision

> Le **test de cohérence** que chaque feature, chaque changement UI,
> chaque message doit passer. Si une feature le rate, elle ne part
> pas — même si elle est « techniquement faisable ».

## Les 5 questions (à passer dans l'ordre)

### 1. La contrainte opérationnelle

> **Est-ce que ça reste gérable par 1 personne, sans curation continue ?**

- ✅ Auto-alimenté (algo déterministe, hash du jour, pas d'humain dans la boucle)
- ✅ UGC avec garde-fous (propositions votées par la communauté)
- ✅ Modération déléguée (pairs-aidants, modérateurs volontaires)
- ❌ Demande de l'animation quotidienne (événements, newsletters, posts)
- ❌ Demande de la curation manuelle (validation de chaque contenu)
- ❌ Demande du support (chat live, tickets, remboursements)

### 2. La cohérence avec les 3 piliers

> **Est-ce que ça renforce AU MOINS un des 3 piliers ?**
> *Gratuit-acte-politique | Lenteur-comme-luxe | Honnêteté-par-défaut*

| Type de feature | Renforce | Dilue |
|---|---|---|
| Algorithme de scoring | rien | honnêteté + lenteur |
| Boost payant | rien | les 3 piliers |
| Fil d'actualité infini | rien | lenteur |
| Match rapide géolocalisé | lenteur (rythme) | honnêteté si pas opt-in |
| Intention publique sur profil | honnêteté | rien |
| Cadeau/souvenir de match | lenteur (rituel) | rien |
| Compteur de likes | rien | lenteur + honnêteté |
| Système de parrainage cash | rien | gratuit-acte-politique |
| Curation de prompts par users | honnêteté (UGC) | rien |

### 3. La différenciation

> **Est-ce qu'aucun des 9 concurrents directs ne le fait mieux que nous ?**

- **Tinder** : match de masse, gamifié, freemium
- **Hinge** : prompts + "designed to be deleted", gamifié
- **Bumble** : women-first, urgence 24h
- **Feeld** : non-conventionnel (kink, poly), communauté
- **Lex** : LGBTQ+, text-first, lex-text (lex-local)
- **Fruitz** : intentions claires (fruit emoji)
- **Hater** : match sur ce que vous détestez
- **#Open** : polyamour explicite
- **Happn** : croisements géolocalisés en temps réel

Si on fait du **mieux qu'eux** : on y va.
Si on fait du **pareil** : on ne le fait pas (sauf si ça renforce un pilier).
Si on fait du **moins bien** : on le fait pas, ou on le fait pas maintenant.

### 4. Le risque RGPD / légal

> **Est-ce qu'on peut expliquer en 1 phrase ce qu'on fait de la donnée ?**

- ✅ « On stocke ton prénom, ta photo, ta géoloc approximée, tes
  messages. Tu peux tout supprimer en 1 clic. »
- ❌ « On analyse ton comportement pour te proposer des matches
  pertinents » (= on vend ton attention, fût-ce indirectement)
- ❌ « On partage avec nos partenaires pour améliorer l'expérience »
  (= bullshit marketing détecté en 0,2 s par les utilisateurs cibles)

### 5. Le test de la transparence

> **Est-ce qu'on est fier de l'expliquer publiquement ?**

Si on hésite à mettre la feature dans la home, dans la FAQ, dans
un tweet, dans une réponse à un journaliste : **elle ne part pas**.

## Quand un principe en contredit un autre

Ça arrive. Exemple : la géoloc temp (Mode Voyage) renforce la
différenciation vs Tinder, mais pose un risque RGPD.

**Règle d'arbitrage** :

1. Contrainte opérationnelle > tout (sans toi, y'a pas de produit)
2. Cohérence avec les piliers > différenciation
3. RGPD > désirabilité produit
4. Transparence > élégance technique

## Anti-patterns à détecter en review

Quand on relit une PR ou une issue, ces phrases sont des drapeaux rouges :

- 🚩 « Ça pourrait être sympa de... » → pas de valeur produit claire, on coupe
- 🚩 « Les users adoreront » → on n'a pas les données, on n'invente pas
- 🚩 « C'est comme Tinder fait » → exactement ce qu'on n'est pas
- 🚩 « Ça prendrait 2h » → ok, mais 2h pour quoi ? quel impact ?
- 🚩 « C'est juste un petit refacto » → vérifier qu'il n'introduit pas de régression silencieuse
- 🚩 « On pourra le désactiver plus tard » → non, on le fait pas tant qu'on peut pas le désactiver dès le jour 1

## Quand on a une bonne idée qui passe pas le test

On la met dans `chantiers/_idees-a-explorer.md` avec :
- L'idée en 2 lignes
- Le test qu'elle rate et pourquoi
- Le trigger qui la rendrait pertinente (« on le fera quand on
  aura 5k users », « quand on aura un modo à mi-temps », etc.)

C'est pas un cimetière d'idées. C'est un **parking** : on gare
l'idée au bon endroit, et on y revient quand le contexte le permet.
