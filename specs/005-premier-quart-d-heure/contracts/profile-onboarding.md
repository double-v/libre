# Contrat — avancement du parcours (`onboardingStep`)

## `GET /api/users/profile` (existant)

Réponse `profile` enrichie, **pour la membre connectée seulement** :

```json
{ "profile": { "…": "…", "onboardingStep": 0 } }
```

Un compte sans profil n'existe plus après la migration ; si `profile` est
`null` malgré tout (course entre inscription et première lecture), le client
traite comme `onboardingStep = 0`.

## `PUT /api/users/profile` (existant, champ ajouté à la whitelist)

```json
{ "onboardingStep": 2, "relationshipType": ["libre"], "searchRelationshipTypes": ["libre"], "searchGenders": [], "searchOrientations": [] }
```

- `onboardingStep` : entier `0..3`, optionnel. Le serveur écrit
  `max(actuel, demandé)` — jamais de recul.
- Les autres champs suivent leurs règles existantes.
- Réponse : le profil complet de la membre, comme aujourd'hui.

## Garde de non-fuite

`onboardingStep` **n'apparaît jamais** dans : `GET /api/users/[id]`,
`GET /api/discover`, `GET /api/geoloc/nearby`, `GET /api/geoloc/crossings`,
`GET /api/matches`, ni dans aucune charge utile push ou temps réel. Test :
`src/__tests__/onboarding-step-never-leaks.test.ts` (base factice qui
honore `select`, même approche que `city-label-never-leaks`).

## Écran `/bienvenue` (contrat d'interface)

| Étape | Titre (copie définitive dans DESIGN.md) | Actions | Écriture |
|---|---|---|---|
| 0 | « Une photo, pour commencer » | Ajouter une photo · Plus tard | `POST /api/users/photos` puis `PUT { onboardingStep: 1 }` ; Plus tard → `PUT { onboardingStep: 1 }` |
| 1 | « Ce que tu cherches » | puces type de relation (obligatoire ? non) · genres · orientations · Continuer · Plus tard | `PUT { relationshipType, searchRelationshipTypes, searchGenders, searchOrientations, onboardingStep: 2 }` ; Plus tard → `PUT { onboardingStep: 2 }` |
| 2 | « Où tu es » | Utiliser ma position · Saisir ma ville · Plus tard | `POST /api/geoloc/update` **ou** `PUT { city }`, puis `PUT { onboardingStep: 3 }` ; Plus tard → `PUT { onboardingStep: 3 }` |
| push | « Être prévenu·e si ça matche ? » | Oui, sur cet appareil · Plus tard | `enablePush()` ; Plus tard → `localStorage libre:push-asked` |
| fin | — | — | `router.replace('/discover')` |

Règles :
- « Plus tard » est toujours visible, jamais grisé, jamais conditionné.
- Aucune étape n'affiche de nombre ni ne mentionne d'autres membres.
- Une erreur d'écriture affiche le message serveur et laisse Réessayer / Plus tard ; elle n'avance pas l'étape.
- Sur `/bienvenue` avec `onboardingStep = 3`, redirection immédiate vers `/discover`.
- La tab bar mobile est masquée ; `SiteNav` reste (déconnexion possible).

## Carte de relance (contrat d'interface)

Rendue en première cellule de la grille « Pour toi » quand
`deriveMissing(profile) !== null` et non écartée depuis 7 jours.

| `deriveMissing` | Copie | Lien |
|---|---|---|
| `photo` | « Ajoute une photo — c'est ce qui donne envie de te découvrir. » | `/profile#profile-section-photos` |
| `seeking` | « Dis ce que tu cherches : les autres sauront si vous cherchez la même chose. » | `/profile#profile-section-orientation` |
| `position` | « Indique où tu es, pour croiser des gens près de chez toi. » | `/profile#profile-section-position` (ancre à ajouter sur `ProfilePositionCard`) |

Bouton secondaire « Plus tard » → `localStorage libre:nudge-dismissed`. Le
texte ne contient aucun chiffre et ne parle que du profil de la personne.
