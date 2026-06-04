# Product

## Register

product

## Users

Adultes francophones en quête de rencontres authentiques, qui fuient les apps de dating algorithmiques (Tinder, Hinge, Bumble) jugées manipulatrices, addictives et opaques. Profil type : 25–45 ans, valeurs éthiques fortes, sensibilité inclusive (handicap, neuroatypie, situations de vie atypiques), envie d'un outil qui respecte leur intelligence et leur temps plutôt que de les enfermer dans un slot machine émotionnel.

Contexte d'usage : soirée ou moment calme à la maison (pas de mobilité forcée), recherche d'une connexion vraie, méfiance vis-à-vis des modèles freemium et de la revente de données.

## Product Purpose

Libre est une alternative radicale aux apps de dating mainstream. Promesse : gratuit, sans limites, sans paywall, sans revente de données, sans manipulation algorithmique. La rencontre reste un acte humain, jamais une mécanique d'engagement.

Succès = un utilisateur qui trouve une connexion qui l'amène à quitter l'app, et qui en parle autour de lui parce que l'expérience était respectueuse. Métrique nord : qualité de connexion perçue, pas temps passé sur l'app.

## Brand Personality

Chaleureux, libre, bienveillant.

Tonalité : "tu" énergie sans familiarité déplacée. Direct mais jamais sec. Inclusif par défaut : aucune hypothèse sur la mobilité, le corps, la situation amoureuse, l'orientation, la neuroatypie. Le français est la langue maternelle de l'interface.

Ce que ça donne en pratique :
- Copy : phrases courtes, verbes concrets, jamais corporate. Pas de "transformez votre vie amoureuse", pas de "votre prochain match vous attend".
- Ton des messages d'erreur : "Une erreur est survenue, réessaie" plutôt qu'un stack trace.
- Couleurs : on assume la chaleur, pas l'austérité froide d'un SaaS B2B.
- Gamification : micro-récompenses discrètes (célébrations fugaces), pas de streak punitif, pas de compteur de likes façon Tinder.

## Anti-references

Sont explicitement bannis dans tout livrable :
- **SaaS générique bleu/blanc/gradient** : palette B2B, illustrations corporate, ton "platform". Nous ne sommes pas un outil d'entreprise.
- **Tinder/Hinge/Bumble** : pas de swipes, pas de compteur de likes, pas de score de désirabilité, pas de "boosts" payants, pas de cartographie de gamification manipulatrice.
- **Duolingo dans sa version agressive** : pas de streak punitif, pas de mascotte insistante, pas de rappel culpabilisant.
- **Crypto / bear-market UI** : pas de dark mode agressif, pas de palette toxique saturée, pas de typographie display façon terminal.
- **Réseaux sociaux addictifs** : pas de badge qui clignote, pas de notification Streak, pas de "tu as 3 likes non lus" comme appât.

## Design Principles

1. **L'humain d'abord, la mécanique ensuite** : chaque feature doit se justifier par la qualité de la connexion humaine, pas par la rétention. Si on doit choisir entre une mécanique engageante et un moment humain, on choisit l'humain.

2. **Chaleur assumée, jamais molle** : la palette coral+cream n'est pas un caprice esthétique, c'est un positionnement. Chaque page doit la porter. Pas de neutre froid autorisé en couleur de fond par défaut.

3. **Inclusion silencieuse** : on n'affiche pas l'inclusion, on la pratique. Pas de badge "accessibilité", pas de mention "version inclusive". Juste un produit qui marche pour tout le monde, partout, sans qu'on ait à y penser.

4. **Subtilité des récompenses** : la gamification doit être ressentie, pas affichée. Une animation fugace quand on complète sa bio, pas un popup "Bravo ! +50 XP !". La fierté se construit, elle ne s'impose pas.

5. **Densité douce** : c'est une app de rencontre, pas un dashboard B2B. On respire, on aère, on laisse de la place aux visages. Les informations denses (filtres, paramètres) sont compactes et efficaces, les surfaces émotionnelles (profils, matches) sont aérées.

## Accessibility & Inclusion

WCAG AA + extras.
- **Contraste** : 4.5:1 minimum sur tout texte courant, 3:1 sur les grands titres. Vérifié sur light et dark mode.
- **Navigation clavier** : tous les parcours doivent être utilisables au clavier seul. Focus visible avec un ring coral contrasté (pas juste un outline gris).
- **Lecteurs d'écran** : chaque input a un `<label>` visible, chaque bouton a un texte accessible, les modals piègent le focus correctement, les annonces live sont pertinentes.
- **Reduced motion** : toutes les animations respectent `@media (prefers-reduced-motion: reduce)`. Pas de transition bloquante, pas d'auto-play qui ne se coupe pas.
- **Dark mode** : pas un invert du light mode, un vrai design sombre qui garde la chaleur. Coral ajusté pour ne pas vibrer sur fond sombre.
- **Pas d'hypothèses corporelles** : "Croisements en chemin" plutôt que "IRL", jamais "sortez", jamais "allez dehors", jamais "à vous de vous voir". Le texte ne suppose jamais qu'on peut se déplacer.
- **Cibles tactiles** : minimum 44px sur tous les éléments interactifs, sans exception.
