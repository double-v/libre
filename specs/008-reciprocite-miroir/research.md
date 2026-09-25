# Research — 008 Réciprocité miroir

Décisions de phase 0, relevées sur le code au 2026-09-25.

## R1 — Où poser la règle

- **Decision** : une fonction pure `canSeeIntention({ isSelf, viewerIntention })`
  dans `src/lib/profile-visibility.ts`, à côté de `canSeePractices`, et un
  assembleur `intentionFor(...)` qui renvoie soit `{ relationshipType }`, soit
  `{ relationshipTypeVeiled: true }`.
- **Rationale** : même famille de décision que les pratiques (#328) ; une seule
  fonction appelée par chaque route empêche deux logiques de diverger (leçon du
  voile photo #330).
- **Alternatives** : masquer côté client (rejeté : la valeur resterait lisible
  dans l'onglet réseau, principe III) ; middleware générique de filtrage des
  réponses (rejeté : trop large pour trois routes).

## R2 — Distinguer « voilé » de « non renseigné » (FR-002)

- **Decision** : clé `relationshipType` **omise** + `relationshipTypeVeiled: true`
  quand la lectrice n'a rien déclaré **et** que la personne lue a une intention.
  Si la personne lue n'a rien, on renvoie `relationshipType: []` sans marqueur,
  que la lectrice soit déclarée ou non.
- **Rationale** : l'interface n'affiche l'invitation que s'il y a quelque chose
  à dévoiler (scénario US1-4). Le marqueur révèle « cette personne a déclaré
  quelque chose », information déjà implicite et sans valeur de déduction.
- **Alternatives** : clé omise seule, comme `practices` (rejeté : ne permet pas
  la distinction voulue) ; valeur sentinelle dans le tableau (rejeté : se
  confondrait avec une vraie valeur).

## R3 — Filtre d'intention (anti-déduction)

- **Decision** : dans `/api/discover`, lire `myProfile` **avant** de construire
  le `where`, et ignorer `relationshipType` du query-string si la lectrice n'a
  pas d'intention. Les préférences `searchRelationshipTypes` enregistrées sont
  conservées en base mais inopérantes tant que le voile tient.
- **Rationale** : sans ça, filtrer « sérieux » révèle l'intention voilée de
  chaque profil renvoyé. Le profil lectrice est déjà lu dans la route (déplacé,
  pas ajouté).
- **Alternatives** : renvoyer 400 (rejeté : FR-012, rien ne se bloque).

## R4 — Nouvelle valeur « je verrai en chemin »

- **Decision** : ajouter `'je verrai en chemin'` à `RELATIONSHIP_TYPE_OPTIONS`
  (19 caractères, sous la limite de 30 du validateur). Les valeurs existantes
  s'affichent telles quelles en chips minuscules ; celle-ci suit le même rendu.
- **Rationale** : liste unique pour la déclaration **et** le filtre (#409) ;
  aucune migration ; le validateur accepte déjà toute chaîne ≤ 30.
- **Alternatives** : clé technique + table de libellés (rejeté : aucune autre
  valeur n'en a, on n'introduit pas un second mécanisme pour une seule).
- **Note** : la valeur peut coexister avec d'autres (le champ est multiple) ;
  on ne force pas l'exclusivité.

## R5 — Invitation distance sans doublon

- **Decision** : une seule ligne en tête de « Pour toi », affichée si la
  lectrice n'a ni `lastGeolocAt` ni `cityLabel` **et** si la carte de relance
  n'affiche pas déjà `position` (`nudgeKind !== 'position'` ou carte écartée).
  Lien vers `/profile#profile-section-position` (ancre déjà utilisée par
  `NUDGE_COPY.position`).
- **Rationale** : FR-010 (une occurrence par écran) ; la carte de relance dit
  déjà la même chose quand `position` est le premier manque.
- **Alternatives** : une mention par carte (rejeté, FR-010) ; ne rien faire
  quand la carte est écartée (rejeté : la carte s'écarte 7 jours, l'invitation
  contextuelle reste utile et discrète).

## R6 — « Ramener là où elle était » (FR-007)

- **Decision** : l'invitation d'intention mène à
  `/profile#profile-section-seeking` (ancre existante de `NUDGE_COPY.seeking`
  et de `ProfileGlance`). Le retour se fait par la navigation arrière ; la
  fiche relit l'API à l'ouverture, donc le voile tombe sans autre mécanisme.
- **Rationale** : pas de nouveau paramètre de retour ; même geste que la carte
  de relance.
- **Alternatives** : réponse inline dans la modale (plus fluide, mais nouvelle
  surface de saisie : à rediscuter au prototype si l'opérateur la préfère).

## R7 — Croisements

- **Decision** : ajouter la lecture du profil lectrice (`select: { relationshipType }`)
  et appliquer `intentionFor`. `CrossingsView` n'affiche pas l'intention
  aujourd'hui : on voile la donnée même sans surface, pour la garde (FR-001).
- **Rationale** : une donnée qui sort de l'API est exposée, affichée ou non.

## R8 — Mesure

- **Decision** : pas de nouvel indicateur. Le bloc `onboarding` de
  `/api/admin/stats` compte déjà les profils avec intention et position. Ligne
  de base le 2026-10-11 (relecture J+21 spec 005), lecture à J+30 de la mise en
  ligne.
