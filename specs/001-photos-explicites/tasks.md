# Tâches — Photos explicites

**Spec** : [spec.md](./spec.md) · **Plan** : [plan.md](./plan.md)

Trois lots, un par user story. Chacun est livrable et démontrable seul. La
maille d'**issue** est le lot, pas la tâche (une issue par user story).

## Lot A — US1 · Modérer sans supprimer (P1)

- **T001** — `PhotoModeration` au schéma + migration additive écrite à la main
  (jamais `migrate dev` : base partagée). Aucune donnée à rétro-remplir,
  l'absence de ligne vaut « ordinaire ».
- **T002** — `src/lib/photo-sensitivity.ts` : niveaux, ordre du seuil, et la
  fonction de décision `canSeeOriginal({ level, viewerThreshold, isOwner, isAdmin, reveal })`.
  Fonction pure, testée en premier — c'est elle qui porte la garantie.
- **T003** — `generateBlurredDerivative(key)` dans `src/lib/r2.ts` : download →
  réduction agressive → flou → upload `<clé>.blur.<ext>`. `sharp` passe en
  dépendance explicite du `package.json`.
- **T004** — `POST` / `DELETE /api/admin/users/[id]/photos/sensitivity` :
  classer / déclasser, **motif obligatoire**, `ModerationLog`
  (`CLASSIFY_PHOTO` / `DECLASSIFY_PHOTO`). Le dérivé doit exister **avant**
  d'écrire la ligne (cf. plan, best-effort inversé).
- **T005** — Brancher `/api/photos/[key]` sur la décision de T002, **après** la
  garde d'accès existante. Tests de non-régression de #323 inchangés.
- **T006** — Composant `SensitivePhoto` (surface floutée + action « Voir »),
  proposé dans `DESIGN.md` avant d'être codé (principe IV).
- **T007** — Affichage : `ProfileModal`, `ProfileCard`, `AdminUserPhotos`. Le
  propriétaire voit net + mention « classée » (FR-005).
- **T008** — Gate visuel : prototype validé, puis vérification sur l'app servie.

**Démonstration** : classer une photo depuis l'admin, la voir floutée depuis un
autre compte, la révéler au clic.

## Lot B — US2 · Choisir une fois pour toutes (P2)

- **T009** — `Profile.photoSensitivityOptIn` (`none` par défaut) + migration.
- **T010** — Validateur (whitelist `profileUpdateSchema`) et passage dans
  `PUT /api/users/profile`.
- **T011** — Le seuil du lecteur alimente la décision de T002 dans le proxy.
- **T012** — Réglage à trois positions dans `/profil`, à côté des autres
  contrôles de confidentialité, enregistré au clic comme la visibilité des
  pratiques (#328).
- **T013** — Tests : chaque combinaison seuil × niveau de photo, et le défaut
  « rien » pour les comptes existants.

**Démonstration** : activer le réglage, le flou disparaît ; le désactiver, il
revient.

## Lot C — US3 · Se déclarer soi-même (P3)

- **T014** — `POST /api/users/photos` accepte un niveau déclaré à l'upload ;
  génération du dérivé dans la foulée.
- **T015** — Case à cocher à l'ajout de photo dans `/profil`.
- **T016** — La décision d'un modérateur prime : une auto-déclaration ne peut
  pas écraser une ligne portant un `classifiedBy`.
- **T017** — Tests de la règle de préséance.

**Démonstration** : cocher à l'upload, la photo arrive floutée chez les autres.

## Ordre et dépendances

```
T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008     (Lot A, séquentiel)
                        ↘ T009 → T010 → T011 → T012 → T013 (Lot B, après T005)
                                    ↘ T014 → T015 → T016 → T017 (Lot C, après T004)
```

## Gates avant PR

1. `npx vitest run`
2. `npx tsc --noEmit`
3. `npx eslint`
4. Prototype validé **puis** captures sur l'app servie (base locale, cf. REX)
