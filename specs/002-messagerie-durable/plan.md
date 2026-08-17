# Plan d'implémentation — Messagerie durable

**Spec** : [spec.md](./spec.md) · **Créé** : 2026-08-17 · **Constitution** : v1.0.0

> Artefacts consolidés dans ce fichier (modèle de données, contrats, guide de
> validation), comme pour `001-photos-explicites` : le dépôt ne fragmente pas en
> `research.md` / `data-model.md` / `contracts/`. Un artefact lu est un artefact
> utile.

## Contrôle de constitution

| Principe | Impact | Verdict |
|---|---|---|
| I — humain d'abord | Répare une perte de données ; aucun ressort d'engagement ajouté. | ✅ |
| II — français, copie non excluante | Copie neuve sur l'échec de déchiffrement (US1) et la page Confidentialité (US3). Dire « le service peut techniquement lire » sans jargon ni fausse réassurance. | ✅ à surveiller en revue de copie |
| III — vie privée, invariant | **Point de tension assumé** : l'escrow retire le zéro-knowledge. Compensé par US3 (dire le vrai) et FR-011 (test par route). La règle « fermé par défaut » reste tenue : la restitution exige une session et ne rend que sa propre clé. | ⚠️ dérogation assumée, tracée en #198 |
| IV — Design System | Un seul état visuel neuf : le message illisible (FR-006). À proposer dans `DESIGN.md` **avant** de coder ; réutiliser le registre de la pierre tombale existante plutôt qu'inventer. | ⚠️ tâche dédiée |
| V — le pixel juge | Surface visuelle touchée (liste de messages) → prototype validé puis vérification sur l'app servie. | ⚠️ deux gates sur le lot A |
| VI — ticket / checkpoint | 5 user stories → 5 issues → 5 PR. #198 et #199 existent, #202 à recadrer sur la purge. | ✅ |

**Dérogation demandée** : une seule, celle du principe III, déjà tranchée par
l'opérateur le 2026-07-08 (#198). Elle n'est pas silencieuse : US3 en fait un
livrable à part entière.

## Décision structurante : où vit la clé privée

| Option | Verdict |
|---|---|
| **Escrow serveur** — la clé privée, enveloppée par une clé maître, vit en base ; un endpoint authentifié la restitue | ✅ **retenue** (décision opérateur #198). Marche pour tous les comptes, y compris sans mot de passe. Coût : le service peut déchiffrer. |
| Clé dérivée du mot de passe | ❌ Échoue pour les comptes Google/GitHub (`passwordHash: null`) et exigerait de capturer le mot de passe en clair au login — on créerait un risque pour en supprimer un autre. |
| Appairage d'appareils (QR, transfert direct) | ❌ Zéro-knowledge préservé, mais suppose l'ancien appareil **disponible et fonctionnel**. Or le cas réel, c'est le téléphone perdu, cassé ou remplacé. Résout le cas facile et laisse le cas dur. |

## Modèle de données

Deux migrations additives, écrites à la main, **jamais** `prisma migrate dev`.
Les colonnes physiques de `user_keys` sont en camelCase (`publicKey`,
`keyCreatedAt`) : les nouvelles le sont aussi, entre guillemets dans le SQL.

### Lot A — `user_keys` s'enrichit

| Champ | Rôle |
|---|---|
| `encryptedPrivateKey String?` | la clé privée sous enveloppe de la clé maître. **Jamais** en clair en base, jamais dans un bundle client. |
| `escrowedAt DateTime?` | date de versement — sert au suivi de migration (US2) et au diagnostic. |

Nullable, sans valeur par défaut : les comptes existants restent valides le temps
que la migration douce passe. Aucun rétro-remplissage n'est possible côté serveur
(il n'a jamais vu ces clés privées) — c'est précisément le rôle d'US2.

### Lot D — l'historique et la clé de conversation (#199)

| Table | Rôle |
|---|---|
| `user_key_history` | `userId`, `publicKey`, `encryptedPrivateKey`, `createdAt`, `retiredAt`. Une génération retirée y est **archivée** au lieu d'être écrasée. C'est ce qui rend un vieux message déchiffrable après rotation. |
| `conversation_keys` | `conversationId`, `userId`, `wrappedKey`, `createdAt`. La clé symétrique du fil, enveloppée pour chaque participant. Une rotation d'identité ré-enveloppe cette clé : **aucun message n'est ré-chiffré**. |
| `messages.encScheme` | `Int @default(1)`. `1` = dérivation ECDH directe (l'existant), `2` = clé de conversation. Additif, défaut sur l'existant : aucune ligne à réécrire. |

Sans `encScheme`, il faudrait deviner le schéma de chaque message à la lecture —
c'est-à-dire tenter, échouer, et retomber dans le silence qu'on est en train de
supprimer.

## Contrats d'API

```
POST /api/users/keys            (existant, étendu)
  { publicKey, privateKey? }
  → enveloppe privateKey si fournie, l'écrit dans encryptedPrivateKey
  → REFUSE (400) si privateKey ne correspond pas à publicKey
  → REFUSE (409) si le compte a déjà une clé publique DIFFÉRENTE au coffre
                 (un client fautif ne doit pas pouvoir écraser un coffre sain)

GET  /api/users/keys/me         (nouveau)
  → 401 sans session ; ne renvoie JAMAIS que la clé du compte de la session
  → { publicKey, privateKey } | { publicKey, privateKey: null } | 404
  → rate-limité comme les autres routes authentifiées
  → Cache-Control: no-store
```

La vérification « la privée correspond-elle à la publique » n'est pas un luxe :
sans elle, un client buggé ou malveillant peut empoisonner le coffre d'un compte
avec une clé qui ne déchiffre rien, et le dégât est irréversible.

## L'ordre des opérations au montage — le point qui décide de tout

C'est ici que se joue FR-005. Le code actuel régénère dès que le `localStorage`
est vide ; c'est la ligne qui détruit les historiques.

```
au montage de useEncryptedChat :
  GET /api/users/keys/me
  ├── coffre garni (publicKey + privateKey)
  │     → clé en MÉMOIRE de session, on n'écrit rien sur le disque.   [US1]
  ├── publicKey connue, coffre VIDE
  │     ├── une clé locale existe ET correspond à publicKey
  │     │     → POST vers le coffre, puis mémoire.                    [US2]
  │     └── sinon
  │           → ÉTAT ILLISIBLE ASSUMÉ : on le dit, on n'écrit rien,
  │             on ne régénère RIEN.                                  [FR-005]
  └── rien côté serveur (compte neuf)
        → générer, POST (publique + privée), mémoire.                 [US1]
  et si le GET échoue (réseau, panne) :
        → état dégradé explicite + réessai. Jamais de génération.
```

La branche « sinon » est contre-intuitive : on préfère afficher un fil illisible
plutôt que de le rendre définitivement illisible en silence. C'est tout l'objet
de la feature.

## Ce que l'escrow ne protège plus — et le cache clair déjà présent

À signaler franchement, parce que ça change la portée d'US3 : la page de
conversation garde déjà un **cache de messages en clair dans `localStorage`**
(`loadPlaintextCache`). Le contenu des conversations est donc, aujourd'hui, en
clair sur l'appareil, indépendamment de l'escrow.

Deux conséquences pour ce chantier :

1. FR-001 (« la clé ne subsiste pas sur l'appareil quitté ») n'est pas tenue par
   le seul retrait de `localStorage` pour la clé : **la déconnexion doit aussi
   purger ce cache clair**, sinon on retire la serrure et on laisse la porte.
2. La copie d'US3 doit décrire cet état, pas seulement l'escrow.

## Les lots

Un lot = une user story = une issue = une PR.

### Lot A — Escrow (US1, #198) — le bloquant

- `src/lib/crypto-escrow.ts`, **server-only** (`import 'server-only'`) :
  `wrapPrivateKey` / `unwrapPrivateKey` en AES-256-GCM via `node:crypto`.
  Enveloppe préfixée `v1:` — sans numéro de version, une rotation future de clé
  maître n'a aucun moyen de distinguer l'ancien du nouveau.
- `GET /api/users/keys/me` + extension du `POST` (contrats ci-dessus).
- Refonte de `useEncryptedChat` selon l'arbre ci-dessus ; clé privée en mémoire
  de session, plus d'écriture disque.
- FR-006 : `tryDecrypt` ne retourne plus le ciphertext en cas d'échec — il
  marque le message comme illisible, et la liste l'affiche comme tel.
- Purge du cache clair et de la clé à la déconnexion.
- Tests : round-trip et détection d'altération sur `crypto-escrow` ; 401,
  isolation entre comptes, refus d'une privée non appariée sur les routes ; les
  quatre branches de l'arbre sur le hook ; Playwright « second navigateur ».
- `CHAT_ESCROW_KEY` dans `.env.example` **et** dans la procédure d'exploitation.

### Lot B — Migration douce (US2, #198)

- Branche « publicKey connue, coffre vide, clé locale correspondante » du hook.
- Journalisation **sans PII** de l'issue de la migration (versée / impossible /
  échec réseau) : sans trace, on ne saura pas combien de comptes sont restés au
  bord du chemin — c'est la leçon de #334, où une réponse uniforme a masqué une
  panne pendant des mois.
- Test : un `localStorage` d'avant la mise en service, puis lecture depuis un
  autre navigateur.

### Lot C — Transparence (US3, #198)

- `/confidentialite` et CGU réécrites : chiffré en transit et au repos, **le
  service peut techniquement lire**, pourquoi ce choix, ce qui est conservé et
  jusqu'à quand (décision 1 : la vie du match).
- Mention du cache clair local.
- Test de non-régression par route (FR-011) : la page contient la formulation
  honnête et **ne contient plus** de promesse de type « personne d'autre ne peut
  les lire ».

### Lot D — Historique de clés et clé de conversation (US4, #199)

- Tables `user_key_history` et `conversation_keys`, colonne `messages.encScheme`.
- Rotation = archiver la génération courante, publier la nouvelle, ré-envelopper
  les clés de conversation. Aucun message ré-chiffré.
- Lecture : `encScheme = 1` passe par la génération de clés d'époque (d'où
  l'historique), `2` par la clé de conversation.
- Test : rotation provoquée, fil antérieur toujours lisible des deux côtés.

### Lot E — Purge réelle (US5, #202)

- Effacement d'un message : la pierre tombale reste (comportement confirmé), et
  le ciphertext est détruit **après une fenêtre de modération** (voir Risques —
  point à trancher avec l'opérateur, la spec le note en FR-014).
- Rupture de match et suppression de compte : vérifier que la cascade détruit
  bien conversation, messages, clés de conversation et coffre — et l'attester par
  un test, pas par lecture du schéma.
- Purge périodique via un cron Vercel (deux crons existent déjà, le patron est en
  place).

## Exploitation de la clé maître — à faire avant la mise en service

C'est le risque numéro un introduit par cette feature : **perdre
`CHAT_ESCROW_KEY`, c'est rendre tous les messages irrécupérables pour tout le
monde**, sans recours.

1. Génération : 32 octets aléatoires, base64, hors de tout dépôt.
2. Stockage : variable d'environnement Vercel (Production, Preview, Development
   séparées — une clé de preview ne doit jamais ouvrir la production).
3. Sauvegarde : une copie hors ligne, gardée comme une clé de coffre-fort. Sans
   elle, une variable d'environnement effacée par mégarde suffit à tout perdre.
4. Rotation : rendue possible par le préfixe `v1:` de l'enveloppe — on
   ré-enveloppe compte par compte, l'ancien format restant lisible pendant la
   transition.
5. Absence en développement : le service doit démarrer et le dire clairement,
   pas échouer par un `undefined` à la première conversation.

## Guide de validation (avant de merger le lot A)

```sh
npx vitest run                     # crypto-escrow, routes, hook
npx tsc --noEmit                   # la CI ne lance pas next build, Vercel si
npx eslint
npm run build                      # Turbopack : à lancer dans un vrai worktree
```

Puis, sur l'app servie (le seul juge selon le principe V) :

1. Se connecter, échanger deux messages, vérifier qu'ils s'affichent.
2. Vider intégralement le stockage local, recharger → **les messages sont
   toujours là**. C'est le test qui définit la feature.
3. Ouvrir un second navigateur, se connecter au même compte → même historique.
4. Répéter avec un compte Google.
5. Falsifier la clé privée en mémoire → le message s'affiche **signalé comme
   illisible**, jamais en ciphertext brut.

## Risques

| Risque | Parade |
|---|---|
| Perte de `CHAT_ESCROW_KEY` → tout est irrécupérable | Procédure d'exploitation ci-dessus, écrite et exécutée **avant** la mise en service. Sauvegarde hors ligne obligatoire. |
| Un client régénère une paire pendant la fenêtre de migration → historique détruit | Branche « sinon » de l'arbre : ne jamais générer quand une clé publique est connue. C'est le test le plus important du lot A. |
| Coffre empoisonné par une privée non appariée | Vérification serveur privée ↔ publique au `POST`, plus refus `409` si une clé différente est déjà au coffre. |
| Le cache clair local reste après déconnexion | Purge explicite à la déconnexion, testée ; mentionnée dans la copie d'US3. |
| **Effacer détruit une preuve de modération** | Le code actuel garde le ciphertext *délibérément* pour la modération (#201). Avec l'escrow, garder le ciphertext revient à garder du contenu lisible par le service. Fenêtre de conservation à trancher avec l'opérateur au moment du lot E — c'est une décision produit, pas technique. |
| Migration douce silencieusement inefficace | Journalisation sans PII des issues de migration, relevée après mise en service. |
| `import 'server-only'` oublié → clé maître dans un bundle | Test de garde : `crypto-escrow` importé côté client doit faire échouer le build. |

## Séquencement

```
Lot A (US1, #198)  ──►  Lot B (US2, #198)  ──►  Lot C (US3, #198)
                                                      │
                        Lot D (US4, #199) ◄───────────┘
                        Lot E (US5, #202)
```

A est livrable seul et apporte déjà la valeur entière du récit principal. B et C
suivent immédiatement — livrer A sans C laisserait une page Confidentialité qui
ment, ce que la constitution interdit (principe III, corollaire #328). D et E
n'ont aucune urgence tant que A tient.
