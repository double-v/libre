# Research — 009 Questions de profil en miroir

> Révisé le 2026-09-25 : sans limite de réponses, banque de 96 questions par
> thèmes, question « habitudes » en texte libre, politique renvoyée à la 010.

## R1 — La banque dans le code

- **Decision** : `src/lib/questions.ts` exporte une liste ordonnée
  `{ key, theme, format, multiple?, options?, label, hint?, retired? }` —
  `format` : `ouverte` · `choix` (2–5 options, précision facultative ;
  `multiple: true` pour le choix multiple) · `ceci-ou-cela` (2 options, une
  seule, sans texte). Chaque option a une clé stable ; une option peut être
  `exclusive` (« Aucun des quatre ») : choisie, elle remplace les autres. La **clé** (ASCII, stable) est ce
  qui est stocké ; intitulé et aide se reformulent sans migration. Retirer une
  question = `retired: true` : plus proposée, réponses existantes affichées.
- **Rationale** : décision opérateur ; chaque ajout passe en revue.
- **Alternatives** : table éditable depuis l'admin (rejeté par l'opérateur).

### Banque validée — 89 questions en 9 thèmes + 24 « Ceci ou cela »

> Revue de l'opérateur du 2026-09-25 (page de revue interactive) : 104 validées
> telles quelles, 7 rejetées (`compliment`, `generosite`, `geste-inconnu`,
> `lieu-enfance`, `message-garde`, `proches-disent`, `rencontre-marquante` —
> « trop déclaratif », « cliché », « faible valeur »), 7 reformulées ci-dessous,
> 2 gardées sans avis (`tout-le-temps`, `tenir-a-quelquun`). Retouche d'implémentation : `journee-parfaite` dit « du matin au soir »
> au lieu de « de bout en bout », expression réservée par la garde des
> promesses de chiffrement (#337). Goût relevé :
> pas d'auto-éloge ni de souvenir sentimental ; oui au ludique et au clivant
> léger (« unpopular opinion »).

Critères : ouvertes, légères ; ni santé, ni politique (→ spec 010), ni
religion, ni sexualité, ni argent, ni corps ; rien qui suppose une mobilité
ou une situation ; écriture inclusive sobre (·e). **Typographie** : espace
insécable (U+00A0) avant « ? » dans le code (vu au prototype : le « ? »
partait seul à la ligne).

**Question « habitudes »** (décision opérateur du 2026-09-25) : texte libre ;
l'aide à la saisie ne cite que des produits légaux et n'incite à rien :
*« Par exemple le café, l'alcool, le tabac, le CBD… Tu en dis ce que tu veux,
ou rien. »* Pas de choix fermés, donc pas de filtre.


**Aides à la saisie** (affichées sous le champ) :

| Clé | Aide |
|---|---|
| `habitudes` | Tu peux parler par exemple du café, de l'alcool, du tabac ou du CBD. Tu en dis ce que tu veux, et rien ne t'oblige à répondre. |
| `confiance` | Un green flag, c'est un signe qui te met en confiance chez quelqu'un. Par exemple : quelqu'un qui tient parole. |
| `red-flag` | Un red flag, c'est un signal d'alerte : un comportement qui te fait prendre tes distances. |
| `unpopular-opinion` | C'est ton unpopular opinion. Par exemple : l'ananas sur la pizza, c'est très bien. |

Les termes anglais courants (green flag, red flag, unpopular opinion) sont
gardés **et expliqués en français** : c'est l'occasion de donner ce
vocabulaire à tout le monde, de 18 à 79 ans (demande de l'opérateur).

**Au quotidien (`quotidien`)**

| Clé | Intitulé | Format |
|---|---|---|
| `dimanche-ideal` | Un dimanche idéal, ça ressemble à quoi ? | ouverte |
| `petit-plaisir` | Ton petit plaisir du quotidien ? | ouverte |
| `matin-ou-soir` | Tu as plus d'énergie le matin ou le soir ? | choix unique : Le matin · Le soir · Ça dépend des jours |
| `heure-libre` | Une heure devant toi, tu en fais quoi ? | ouverte |
| `rituel` | Un rituel auquel tu tiens ? | ouverte |
| `bruit-de-fond` | Chez toi, qu'est-ce qui tourne en fond : musique, podcast, silence ? | choix multiple : Musique · Podcast · Radio · Silence |
| `plat-reconfort` | Le plat qui te réconforte ? | ouverte |
| `cuisine-plaisir` | Ce que tu cuisines quand tu veux faire plaisir ? | ouverte |
| `endroit-reflechir` | Ton endroit préféré pour réfléchir ? | ouverte |
| `objet-fetiche` | Un objet dont tu ne te sépares pas ? | ouverte |
| `derniere-decouverte` | Ta dernière petite découverte ? | ouverte |
| `jour-de-pluie` | Un jour de pluie, idéalement ? | choix multiple : Sous un plaid · Dehors quand même · Au café · Au lit |

**Goûts & culture (`culture`)**

| Clé | Intitulé | Format |
|---|---|---|
| `chanson` | Une chanson que tu ne te lasses pas d'écouter ? | ouverte |
| `oeuvre-marquante` | Un livre, un film ou une série qui t'a marqué·e ? | ouverte |
| `revoir-dix-fois` | Ce que tu pourrais relire ou revoir dix fois ? | ouverte |
| `plaisir-coupable` | Un plaisir coupable, côté culture ? | ouverte |
| `artiste-a-decouvrir` | Un·e artiste que tu aimerais faire découvrir ? | ouverte |
| `bande-son` | La bande-son de ta vie en ce moment ? | ouverte |
| `personnage` | Un personnage de fiction dont tu te sens proche ? | ouverte |
| `derniere-claque` | La dernière œuvre qui t'a mis une claque ? | ouverte |
| `jeu` | À quels jeux aimes-tu jouer ? | choix multiple : Jeux de société · Jeux vidéo · Jeux de mots · Jeux de cartes · *Je ne suis pas trop joueur·se* (exclusive) |
| `a-recommander` | Un podcast, une chaîne ou une newsletter à recommander ? | ouverte |
| `citation` | Une phrase ou une citation qui te suit ? | ouverte |
| `musee` | Si tu avais ton musée, on y verrait quoi ? | ouverte |

**Rire & légèreté (`rire`)**

| Clé | Intitulé | Format |
|---|---|---|
| `fait-rire` | Qu'est-ce qui te fait rire à coup sûr ? | ouverte |
| `dernier-sourire` | La dernière chose qui t'a donné le sourire ? | ouverte |
| `talent-inutile` | Un talent parfaitement inutile dont tu es fier·e ? | ouverte |
| `blague` | Ta meilleure (ou ta pire) blague ? | ouverte |
| `anecdote` | Une anecdote que tu racontes souvent ? | ouverte |
| `unpopular-opinion` | Quel avis défends-tu alors que presque personne n'est d'accord ? | ouverte — avec aide |
| `super-pouvoir` | Un super-pouvoir modeste que tu aimerais avoir ? | choix unique : Ne jamais avoir froid · Retrouver ses clés · Toujours avoir du réseau · Autre |
| `animal` | Si tu étais un animal, lequel, et pourquoi ? | choix unique : Chat · Chien · Oiseau · Poisson · Autre (précise !) |
| `mot-prefere` | Ton mot préféré, et pourquoi ? | ouverte |
| `expression` | Une expression que tu dis tout le temps ? | ouverte |
| `petite-honte` | Une petite honte qui te fait rire aujourd'hui ? | ouverte |

**Liens & relations (`liens`)**

| Clé | Intitulé | Format |
|---|---|---|
| `touche-chez-quelquun` | Ce qui te touche chez quelqu'un ? | ouverte |
| `en-amitie` | Ce que tu apportes dans une amitié ? | ouverte |
| `petite-attention` | Une petite attention qui te fait fondre ? | ouverte |
| `apres-desaccord` | Après un désaccord, tu fais comment ? | choix unique : J'en parle tout de suite · J'ai besoin d'un temps · Ça dépend |
| `quand-ca-va-pas` | Quand ça ne va pas, qu'est-ce qui t'aide ? | ouverte |
| `tenir-a-quelquun` | À quoi on reconnaît que tu tiens à quelqu'un ? | ouverte |
| `silence-a-deux` | Le silence avec quelqu'un : confortable ou pas ? | choix unique : Confortable · Ça dépend · Pas trop |
| `libre-a-deux` | « Être libre à deux », ça veut dire quoi pour toi ? | ouverte |
| `rythme` | Ton rythme idéal pour faire connaissance ? | choix unique : Doucement · Au feeling · Sans tarder |
| `red-flag` | Quel est ton red flag ? | ouverte — avec aide |

**Façon de voir (`valeurs`)**

| Clé | Intitulé | Format |
|---|---|---|
| `conviction-changee` | Une conviction qui a changé avec le temps ? | ouverte |
| `fierte-discrete` | Une chose dont tu es fier·e sans le crier ? | ouverte |
| `agace` | Une petite chose du quotidien qui t'agace ? | ouverte |
| `echec-appris` | Ce qu'un échec t'a appris ? | ouverte |
| `prendre-son-temps` | Ce que tu refuses de faire vite ? | ouverte |
| `regle-perso` | Une règle que tu t'es fixée ? | ouverte |
| `changer-avis` | Qu'est-ce qui peut te faire changer d'avis ? | ouverte |
| `compte-moins` | Une chose qui compte moins pour toi qu'avant ? | ouverte |
| `meilleur-conseil` | Le meilleur conseil qu'on t'ait donné ? | ouverte |

**Envies & rêves (`envies`)**

| Clé | Intitulé | Format |
|---|---|---|
| `apprendre` | Une chose que tu aimerais apprendre ? | ouverte |
| `curieux-en-ce-moment` | Qu'est-ce qui te rend curieux·se en ce moment ? | ouverte |
| `projet` | Un projet qui te tient à cœur ? | ouverte |
| `tout-le-temps` | Si tu avais tout le temps du monde, tu ferais quoi ? | ouverte |
| `lieu-reve` | Un lieu, réel ou imaginaire, où tu aimerais être là, tout de suite ? | ouverte |
| `dans-quelques-annees` | Toi dans quelques années, idéalement ? | ouverte |
| `pas-encore-ose` | Une chose que tu n'as pas encore osé faire ? | ouverte |
| `collection` | Ce que tu collectionnes, ou aimerais collectionner ? | ouverte |
| `creer` | Ce que tu aimes créer, fabriquer, bricoler ? | ouverte |
| `journee-parfaite` | Une journée parfaite, du matin au soir ? | ouverte |

**Souvenirs (`souvenirs`)**

| Clé | Intitulé | Format |
|---|---|---|
| `odeur-souvenir` | Une odeur qui te ramène à un souvenir ? | ouverte |
| `souvenir-enfance` | Un souvenir d'enfance qui te fait sourire ? | ouverte |
| `petite-victoire` | Une petite victoire récente ? | ouverte |
| `annee-a-revivre` | Une année que tu revivrais ? | ouverte |
| `fou-rire` | Ton plus grand fou rire ? | ouverte |
| `plus-beau-cadeau` | Le plus beau cadeau reçu (ou fait) ? | ouverte |

**Habitudes (`habitudes`)**

| Clé | Intitulé | Format |
|---|---|---|
| `habitudes` | Côté habitudes, tu te situes où ? | ouverte — aide légale |
| `cafe-the` | Café, thé, ou autre chose ? | choix multiple : Café · Thé · Tisane · Chocolat chaud · *Aucun des quatre* (exclusive) |
| `couche-tot-tard` | Couche-tôt ou couche-tard ? | choix unique : Couche-tôt · Couche-tard · Ça dépend |
| `ecrans` | Ton rapport aux écrans ? | choix unique : J'en décroche facilement · Toujours connecté·e · Je fais des pauses exprès |
| `range-desordre` | Plutôt rangé·e ou joyeux désordre ? | choix unique : Rangé·e · Joyeux désordre · Rangé·e en surface |
| `planifier-improviser` | Tout planifier ou improviser ? | choix unique : Je planifie · J'improvise · Un peu des deux |
| `soiree-ideale` | Une soirée idéale, elle se passe où ? | choix multiple : Chez moi · Chez des proches · Dehors · *Peu importe le lieu, tant que la compagnie est bonne* (exclusive) |
| `animaux` | Les animaux et toi ? | choix unique : J'en ai · J'aimerais en avoir · Plutôt ceux des autres · Pas trop mon truc |
| `plantes` | Main verte ou cimetière à plantes ? | choix unique : Main verte · En progrès · Cimetière à plantes |
| `appel-ou-message` | Appel, vocal ou message ? | choix multiple : Appel · Vocal · Message · Visio |

**Pour se rencontrer (`rencontre`)**

| Clé | Intitulé | Format |
|---|---|---|
| `premier-message` | Un premier message qui te donnerait envie de répondre ? | ouverte |
| `premiere-conversation` | Une première conversation réussie, ça ressemble à quoi ? | ouverte |
| `on-s-entendra-si` | On s'entendra bien si… | ouverte |
| `moins-bien-si` | On risque de moins s'entendre si… | ouverte |
| `ce-que-j-espere` | Ce que tu espères trouver ici ? | ouverte |
| `me-connaitre` | Le meilleur moyen de te connaître ? | ouverte |
| `question-a-poser` | Une question que tu aimerais qu'on te pose ? | ouverte |
| `confiance` | Quel est ton green flag ? | ouverte — avec aide |
| `partager` | Une chose que tu aimerais partager avec quelqu'un ? | ouverte |


**Ceci ou cela (`ceci-ou-cela`)** — format *ceci-ou-cela*, rien à écrire

| Clé | Option A | Option B |
|---|---|---|
| `mer-montagne` | Mer | Montagne |
| `chat-chien` | Chat | Chien |
| `sale-sucre` | Salé | Sucré |
| `livre-film` | Livre | Film |
| `lever-coucher` | Lever de soleil | Coucher de soleil |
| `ville-campagne` | Ville | Campagne |
| `ete-hiver` | Été | Hiver |
| `karaoke-blindtest` | Karaoké | Blind test |
| `pizza-sushi` | Pizza | Sushi |
| `spoilers` | Spoilers : jamais | Spoilers : m'en fiche |
| `dessert-fromage` | Dessert | Fromage |
| `pluie-soleil` | Pluie | Soleil |
| `serie-longue-courte` | Série à rallonge | Mini-série |
| `gagner-participer` | Jouer pour gagner | Jouer pour jouer |
| `papier-numerique` | Livre papier | Liseuse |
| `brunch-diner` | Brunch | Dîner |
| `matin-bavard` | Matin silencieux | Matin bavard |
| `mots-croises-sudoku` | Mots croisés | Sudoku |
| `classique-nouveaute` | Classiques | Nouveautés |
| `groupe-comite` | Grande tablée | Petit comité |
| `garder-jeter` | Tout garder | Tout jeter |
| `recette-au-pif` | Recette | Au pif |
| `leve-tot-grasse-mat` | Lève-tôt | Grasse matinée |
| `message-long-court` | Messages longs | Messages courts |

## R2 — Une table plutôt qu'un champ JSON du profil

- **Decision** : `profile_answers (id, userId, questionKey, text, status,
  createdAt, updatedAt)`, unicité `(userId, questionKey)`, index `(userId)`,
  cascade à la suppression du compte.
- **Rationale** : la modération agit **par réponse** (FR-009) avec un état ;
  l'unicité est garantie par la base. Pas de limite : une réponse par
  question, bornée par la banque.
- **Alternatives** : `Json` sur `Profile` (rejeté : pas d'état par réponse,
  unicité et limite à la main, risque de mass assignment via la route profil).

## R3 — La décision miroir

- **Decision** : `answersFor({ isSelf, viewerKeys, answers })` dans
  `src/lib/answers.ts`. Pour chaque réponse **publiée** de la personne lue :
  `{ key, label, text }` si `isSelf` ou si `viewerKeys` contient la clé ;
  sinon `{ key, label, veiled: true }` (texte **absent**). `viewerKeys`
  `undefined` (lecture en échec) → tout voilé. Les réponses retirées par la
  modération ne sortent jamais vers autrui.
- **Rationale** : même famille que `intentionFor` (spec 008) ; une seule
  fonction pour toutes les routes (#328, #330).
- **Note** : une réponse **retirée** de la lectrice ne compte pas pour lever
  le voile (sinon publier n'importe quoi, se faire retirer, garder l'accès).

## R4 — Saisie en place dans la fiche

- **Decision** : sous une question voilée, « Réponds aussi pour lire la
  sienne » déplie un champ (Input multiligne) ; l'enregistrement appelle
  `PUT /api/users/me/answers` puis relit la fiche (`GET /api/users/[id]`),
  qui renvoie alors la réponse.
- **Rationale** : clarification opérateur ; le serveur reste seul juge.
- **Alternatives** : renvoyer vers le profil (rejeté par l'opérateur).
- **Ordre de la fiche** : questions en commun (lisibles) d'abord, puis trois
  invitations au plus, puis « Voir toutes ses réponses » replié — sans nombre.
  Le serveur trie, le client n'invente rien.

## R4c — Formats pour les personnes réservées (retour opérateur 2026-09-25)

- **Decision** : trois formats (FR-002b). Une pastille suffit comme réponse ;
  le champ « Tu veux préciser ? » reste replié jusqu'au toucher. « Ceci ou
  cela » est un mode à part, un toucher par paire, sans texte.
- **Rationale** : la page blanche décourage les personnes timides ou pudiques ;
  les pastilles leur permettent de se dire un peu, les plus expressives
  gardent le texte. Les choix ne sont **pas filtrables** en 009 (la 010
  décidera, avec son cadre RGPD).
- **Alternatives** : tout en texte avec suggestions de phrases (rejeté :
  toujours une page à remplir) ; tout en QCM (rejeté : bride les plus
  expressifs, aplatit les profils).

## R4d — Choix unique ou multiple (retour opérateur 2026-09-25)

- **Decision** : chaque question à choix déclare `multiple`. L'écran le dit en
  toutes lettres sous l'intitulé : « Choisis une réponse. » ou « Tu peux
  choisir plusieurs réponses. ». Unique : choisir une option remplace la
  précédente. Multiple : chaque option s'ajoute ou se retire ; une option
  `exclusive` désélectionne les autres, et inversement. Sur la fiche, un
  choix multiple s'affiche en pastilles côte à côte.
- **Classement de la banque** : 6 questions à choix multiple (`bruit-de-fond`,
  `jour-de-pluie`, `jeu`, `cafe-the`, `soiree-ideale`, `appel-ou-message`),
  12 à choix unique. « Café, thé » perd « Les deux » (inutile en multiple) ;
  « Appel ou message » perd « Tout sauf l'appel » (contradictoire en
  multiple) et gagne « Visio ».
- **Rationale** : exemple de l'opérateur (« Un jeu qui te plaît ») ; imposer
  un seul choix y trahit la réponse. L'indication écrite vaut mieux qu'une
  différence purement visuelle (cases carrées ou rondes) pour un public de
  18 à 79 ans.

## R4b — Répondre à la suite

- **Decision** : dans le profil, « Répondre à la suite » affiche une question
  sans réponse (thème choisi ou tous), « Enregistrer » ou « Passer », puis la
  suivante ; sortie libre. Les questions passées reviennent en fin de file
  dans la session, sans être mémorisées en base.
- **Rationale** : l'élan « OkCupid » rapporté par la bêta-testeuse ; aucune
  mécanique de rétention (pas de série, pas de compteur).

## R5 — Détection de contact partagée

- **Decision** : extraire `contientUnContact` de `src/lib/pseudo.ts` vers
  `src/lib/contact.ts` (même comportement, tests déplacés), l'utiliser pour
  le pseudo et les réponses ; #443 s'y branchera.
- **Rationale** : une réponse ne doit pas porter plus qu'un pseudo ; une seule
  règle à faire évoluer.
- **Note** : dans une réponse, un nombre isolé (« 3 chats ») reste permis ; la
  règle « 6 chiffres » vise les numéros.

## R6 — Validation d'une réponse

- **Decision** : NFC, espaces fusionnés **sans** écraser les retours à la
  ligne (1 saut max consécutif), 1–300 caractères, refus des contacts, refus
  des caractères de contrôle/format invisibles (comme le pseudo). Emoji et
  ponctuation **permis** (c'est du texte, pas un identifiant).
- **Alternatives** : liste blanche du pseudo (rejeté : trop stricte pour une
  phrase).

## R7 — Modération

- **Decision** (amendée après la revue de la PR #466) :
  - **Preuve figée** : au signalement, les réponses publiées du profil
    signalé sont copiées dans `reports.answersSnapshot` (best-effort). L'admin
    voit « au moment du signalement » et « aujourd'hui » : la personne signalée
    ne peut plus effacer la preuve en modifiant ou supprimant ses réponses.
  - **Retrait** : `PATCH /api/admin/answers/[id]` passe la réponse `removed`
    et garde `removedText`, `removedChoices`, `removedAt`. Journal
    `ModerationLog` (`REMOVE_ANSWER`, `reason` = clé, jamais le texte).
  - **Republication** : l'identique (texte normalisé et mêmes choix) est
    refusé (`identique-retiree`) ; une réponse différente est publiée et
    marquée « Réécrite après un retrait » dans l'admin.
  - L'autrice voit « Cette réponse a été retirée par la modération » (ou « Ce
    choix… » pour une paire) et peut en écrire une autre.
- **Rationale** : réutilise signalement et journal existants (#321/#322) ; la
  revue a montré qu'un retrait s'annulait en renvoyant le même texte et que la
  preuve pouvait disparaître avant la revue.

## R8 — Mesure (SC-002, SC-003)

- **Decision** : bloc `answers` dans `GET /api/admin/stats` :
  part des profils actifs avec ≥ 1 réponse (SC-002) ; parmi les
  conversations créées sur la fenêtre, part où les deux membres partagent au
  moins une question répondue, comparée à la part attendue au hasard (SC-003,
  proxy : aucune lecture du contenu chiffré, aucun événement de lecture de
  fiche journalisé).
- **Alternatives** : journaliser « a lu une réponse puis écrit » (rejeté :
  traçage de comportement individuel, contraire au principe I).

## R9 — Débit

- **Decision** : préréglage `answers: { limit: 120, windowMs: 3_600_000 }` sur
  `PUT`/`DELETE` — « Répondre à la suite » enchaîne des dizaines de réponses.
