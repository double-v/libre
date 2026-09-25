# Research — 009 Questions de profil en miroir

## R1 — La banque dans le code

- **Decision** : `src/lib/questions.ts` exporte une liste ordonnée
  `{ key, label, retired? }`. La **clé** (ASCII, stable) est ce qui est stocké ;
  l'intitulé peut être reformulé sans migration. Retirer une question =
  `retired: true` : plus proposée, mais les réponses existantes s'affichent.
- **Rationale** : décision opérateur (clarification) ; chaque ajout passe en
  revue ; aucune table ni écran admin.
- **Alternatives** : table éditable depuis l'admin (rejeté par l'opérateur).

### Banque initiale proposée (à valider par l'opérateur)

Critères : ouvertes, légères, sans thème sensible (santé, politique, religion,
sexualité, argent, corps), sans supposer une mobilité, un corps ou une
situation ; écriture inclusive sobre (·e) comme ailleurs dans l'app.

| Clé | Intitulé |
|---|---|
| `dimanche-ideal` | Un dimanche idéal, ça ressemble à quoi ? |
| `fait-rire` | Qu'est-ce qui te fait rire à coup sûr ? |
| `dernier-sourire` | La dernière chose qui t'a donné le sourire ? |
| `chanson` | Une chanson que tu ne te lasses pas d'écouter ? |
| `oeuvre-marquante` | Un livre, un film ou une série qui t'a marqué·e ? |
| `petit-plaisir` | Ton petit plaisir du quotidien ? |
| `talent-inutile` | Un talent parfaitement inutile dont tu es fier·e ? |
| `amis-disent` | Ce que tes proches disent de toi ? |
| `apprendre` | Une chose que tu aimerais apprendre ? |
| `plat-reconfort` | Le plat qui te réconforte ? |
| `conversation-longue` | Un sujet sur lequel tu pourrais parler des heures ? |
| `touche-chez-quelquun` | Ce qui te touche chez quelqu'un ? |
| `endroit-reflechir` | Ton endroit préféré pour réfléchir ? |
| `petite-victoire` | Une petite victoire récente ? |
| `compliment` | Un compliment qui t'a marqué·e ? |
| `heure-libre` | Une heure devant toi, tu en fais quoi ? |
| `odeur-souvenir` | Une odeur qui te ramène à un souvenir ? |
| `curieux-en-ce-moment` | Qu'est-ce qui te rend curieux·se en ce moment ? |
| `premier-message` | Un premier message qui te donnerait envie de répondre ? |
| `mot-prefere` | Ton mot préféré, et pourquoi ? |

## R2 — Une table plutôt qu'un champ JSON du profil

- **Decision** : `profile_answers (id, userId, questionKey, text, status,
  createdAt, updatedAt)`, unicité `(userId, questionKey)`, index `(userId)`,
  cascade à la suppression du compte.
- **Rationale** : la modération agit **par réponse** (FR-009) avec un état ;
  l'unicité est garantie par la base ; la limite de 5 se vérifie en
  transaction.
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
  qui renvoie alors la réponse. Si la lectrice a déjà 5 réponses, le champ
  propose d'en remplacer une (liste de ses questions), dans le même `PUT`
  (`replaces`), en transaction.
- **Rationale** : clarification opérateur ; une relecture évite de deviner
  côté client (le serveur reste seul juge).
- **Alternatives** : renvoyer vers le profil (rejeté par l'opérateur).

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

- **Decision** : `/admin/reports` affiche, pour un signalement, les réponses
  publiées du profil signalé ; bouton « Retirer » → `PATCH
  /api/admin/answers/[id]` (`status: 'removed'`), journalisé dans
  `ModerationLog` (`action: 'REMOVE_ANSWER'`, `reason` = clé de question, jamais
  le texte). L'autrice voit « Cette réponse a été retirée par la modération. »
  dans son profil et peut la réécrire.
- **Rationale** : réutilise signalement et journal existants (#321/#322).

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

- **Decision** : préréglage `answers: { limit: 20, windowMs: 3_600_000 }` sur
  `PUT`/`DELETE`.
