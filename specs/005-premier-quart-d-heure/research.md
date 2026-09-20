# Research — Le premier quart d'heure

Toutes les inconnues du Technical Context sont résolues ici. Chaque décision
s'appuie sur ce que le dépôt fait déjà ; on n'introduit rien qui n'ait un
précédent.

## R1 — Où vit l'avancement du parcours ?

**Decision** : une colonne `profiles.onboardingStep INTEGER NOT NULL DEFAULT 0`.
Valeurs : `0` = étape photo à montrer, `1` = étape « ce que je cherche »,
`2` = étape « où », `3` = terminé (ou entièrement passé). L'étape push n'a pas
de numéro : elle se présente au passage `2 → 3` et son refus se mémorise par
appareil (`localStorage`, comme l'écartement de la carte), pas en base.

**Rationale** : FR-010 exige de reprendre à l'étape en cours après avoir
quitté l'app, y compris depuis un autre appareil — `localStorage` ne le
permet pas. Un entier ordonné suffit : le parcours est linéaire et ne se
représente plus une fois à 3. Il ne se dérive pas du contenu du profil (une
étape passée sans saisie doit rester passée), d'où un champ explicite.

**Alternatives considered** : dériver l'étape des champs manquants (photo →
0, etc.) — casse « Plus tard » ; `onboardedAt DateTime?` seul — ne dit pas où
reprendre ; un modèle `OnboardingProgress` séparé — un objet pour un entier.

## R2 — Où vit le parcours et comment on y entre ?

**Decision** : route `src/app/(main)/bienvenue/page.tsx`, protégée comme les
autres pages `(main)` par `proxy.ts`. Entrée : la page Découvrir charge déjà
`GET /api/users/profile` (pour les filtres) ; si `onboardingStep < 3` **et**
que la règle FR-011/FR-023 s'applique, elle fait `router.replace('/bienvenue')`
avant de rendre le feed. `/login?registered=true` garde son `callbackUrl`
`/discover` : la garde fait le reste. La tab bar mobile — aujourd'hui rendue
sans condition dans `MainShell` (`(main)/layout.tsx`) — est masquée quand
`pathname` commence par `/bienvenue`, pour que le parcours soit un tunnel
court sans issue latérale autre que « Plus tard ». C'est la première
condition sur cette barre ; on la garde à une ligne.

**Rationale** : l'inscription ne connecte pas (vérification e-mail avant
login, `auth.ts:159`) : le point d'entrée fiable est la première arrivée
connectée, c'est-à-dire Découvrir. On y lit déjà le profil, donc aucune
requête de plus. Une garde dans `proxy.ts` aurait exigé de lire la base
dans le middleware ou de mettre `onboardingStep` dans le JWT (périmé dès la
première saisie).

**Alternatives considered** : garde dans `(main)/layout.tsx` (server
component) — imposerait une lecture DB à chaque navigation de l'app ;
claim JWT — désynchronisé ; sous `(auth)` — pas de session garantie.

## R3 — Règle « qui voit le parcours » (FR-011 / FR-023)

**Decision** : la migration règle `onboardingStep = 3` pour tout profil
existant qui a **au moins un** des trois éléments (photo, type de relation,
position) ; les profils entièrement vides restent à `0`, et les comptes sans
profil reçoivent un profil vide à `0`. Après migration, la garde client est
donc uniquement `onboardingStep < 3` : la règle métier est appliquée une
fois, en SQL, pas rejouée à chaque rendu.

**Rationale** : FR-023 est une décision sur l'existant, prise une fois. La
coder côté client obligerait à répéter « a-t-il une photo ou un type ou une
position ? » et à la maintenir. Le backfill est idempotent (`WHERE
"onboardingStep" = 0 AND (...)`).

**Alternatives considered** : règle côté client — dérive au fil du temps ;
flag `legacy` — un champ de plus pour un cas transitoire.

## R4 — Tri « photo d'abord » sans casser la pagination

**Decision** : sur les deux chemins de « Pour toi » (`tab=all` sans distance
: curseur Prisma ; avec distance : tri mémoire), ordonner par
« a une photo » décroissant puis `lastActive` décroissant puis `userId`.
- Chemin mémoire : ajouter la clé en tête du comparateur et encoder
  `sortValue` comme `hasPhoto * 2^53 + lastActive` — reste un nombre, donc
  le curseur composite `(sortValue, userId)` fonctionne tel quel.
- Chemin curseur Prisma : Prisma ne trie pas sur `array_length`. On ajoute
  une colonne dérivée ? Non : on passe ce chemin en tri mémoire **borné** :
  `findMany` sans `take` sur `baseWhere` reste petit (72 profils, quelques
  centaines à horizon visible), et c'est déjà ce que fait le chemin
  « À proximité ». On unifie donc les deux chemins de « Pour toi » sur
  `paginateSorted`, ce qui simplifie le code.

**Rationale** : FR-022 exige un tri stable et paginable. Le dépôt a déjà
résolu ce problème pour la distance (#180, #327) : même outil. Le volume
justifie de ne pas ajouter de colonne `hasPhoto` maintenue par trigger ou
par les routes photos — à revisiter au-delà de ~5 000 profils (note dans
le contrat).

**Alternatives considered** : colonne `hasPhoto` maintenue par
`POST/DELETE /api/users/photos` — un invariant de plus à garder vrai ;
`$queryRaw` avec `cardinality(photos) > 0` — sort du pattern du fichier ;
tri par page seulement — les pages 2+ mélangent.

## R5 — Étape photo : réutiliser l'upload existant

**Decision** : `StepPhoto` appelle `POST /api/users/photos` (multipart, même
contrainte 6 photos, même modération) via la même fonction que
`ProfilePhotoHero` ; on extrait l'appel dans `src/lib/photos-client.ts` si
ce n'est pas déjà factorisé. Le composant affiche l'erreur serveur telle
quelle (format, poids, modération) et laisse « Réessayer » / « Plus tard ».

**Rationale** : FR-007 (chaque saisie enregistrée à son étape) et edge case
« photo refusée » sont déjà couverts par la route. Aucune API nouvelle.

## R6 — Étape « ce que je cherche » : une écriture, deux cibles

**Decision** : un seul `PUT /api/users/profile` avec
`{ relationshipType, searchRelationshipTypes, searchGenders,
searchOrientations, onboardingStep: 2 }`. Le type de relation choisi
alimente **à la fois** ce que je déclare (`relationshipType`) et ce que je
cherche (`searchRelationshipTypes`) — c'est FR-008 ; la personne peut
dissocier plus tard dans le profil.

**Rationale** : `PUT profile` accepte déjà tous ces champs (whitelist,
#409 pour `searchRelationshipTypes`). On ajoute `onboardingStep` à la
whitelist et aux validators. L'avancement voyage dans la même écriture que
la saisie : pas d'état intermédiaire « saisi mais pas avancé ».

## R7 — Étape « où » : appareil puis ville

**Decision** : `StepPosition` réutilise `useGeolocation` + `POST
/api/geoloc/update` pour la position de l'appareil, et `CityPicker` +
`defaultSaveCity` (spec 004) pour la ville. L'avancement `onboardingStep: 3`
est écrit par un `PUT profile` séparé après succès ou « Plus tard ».

**Rationale** : ces deux écritures ne passent pas par `PUT profile`
(routes dédiées avec leurs gardes de floutage et de géocodage) ; on ne les
duplique pas. Deux requêtes sur cette étape, c'est acceptable.

## R8 — Proposition push : quand, et mémorisation du refus

**Decision** : après l'étape « où », si `getPushSupport().supported` et que
`getPushState()` n'est ni `on` ni `denied`, afficher `StepPush` ;
« Oui » → `enablePush()` ; « Plus tard » → `localStorage['libre:push-asked']
= date`. `StepPush` est sauté si la clé existe ou si le support manque
(FR-016). Le passage à `onboardingStep = 3` a lieu **avant** cette étape,
pour qu'un rechargement pendant la demande de permission ne renvoie pas
dans le parcours.

**Rationale** : FR-014 dit « non redemandé par le parcours » — pas « jamais
plus » : Paramètres reste la porte. Par appareil, comme l'abonnement lui-même.
`PushSettings` reste la source de vérité de la copie et des états ; `StepPush`
en est une variante « une question, deux boutons ».

## R9 — Carte de relance dans la grille

**Decision** : `ProfileNudgeCard` rendu en **première cellule** de la grille
« Pour toi » (avant `visibleUsers`), même géométrie que `ProfileCard`, quand
`deriveMissing(profile)` renvoie un élément et que `localStorage['libre:nudge-dismissed']`
est absent ou date de plus de 7 jours. `deriveMissing` (dans
`src/lib/onboarding.ts`) renvoie `'photo' | 'seeking' | 'position' | null`
dans cet ordre. Le lien mène à `/profile#profile-section-photos`,
`/profile#profile-section-orientation` (ancres existantes de
`ProfileSection`) ou `/profile#profile-section-position` — cette dernière
ancre est à poser sur `ProfilePositionCard`, qui n'en a pas encore.

**Rationale** : FR-017 à FR-020. La grille accepte déjà une cellule non-profil
(carte de parrainage, `GridFillerCards`) : même emplacement, même DS. Par
appareil, comme la spec l'assume. Aucun nombre, aucune mention d'autrui :
la copie est fixée dans le contrat.

**Alternatives considered** : bandeau au-dessus de la grille — casse la
densité douce et reste après le scroll ; `ProfileCompleteness` (page profil)
— liste six champs, trop et pas au bon endroit.

## R10 — Mesure des critères de succès

**Decision** : ajouter à `GET /api/admin/stats` trois agrégats : part des
comptes créés depuis 30 jours avec photo / position / type de relation à
J+1, part revenus après J+1 (`lastActive - createdAt > 1 j`), et nombre
d'appareils abonnés. Surface admin uniquement (`CountChip` autorisé).

**Rationale** : SC-001 à SC-007 doivent se lire sans requête à la main. La
spec 003-admin-analytics a posé le cadre ; on l'étend, on ne crée pas de
nouvel écran.
