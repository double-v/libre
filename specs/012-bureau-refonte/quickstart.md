# Validation — Spec 012

Environnement : PostgreSQL local + seed factice + `next dev`, Chromium en cache pour les captures (voir la mémoire « Tester la livraison en local »). **Jamais** la base Neon ni des données de membres réels (règle « données membres hors IA »).

## Pré-requis

1. `npm ci`, `.env` local pointant sur la base locale, `R2_ACCOUNT_ID=` vide (uploads simulés).
2. Migrations de la spec appliquées sur la base locale.
3. Seed de démonstration : 2 comptes ADMIN (« Toi », « Sam »), une quinzaine de membres factices couvrant chaque type de cas du prototype.

## Gates (constitution)

```sh
npx vitest run > "$SCRATCH/vitest.log" 2>&1; tail -5 "$SCRATCH/vitest.log"
npx tsc --noEmit
npx eslint src
```

## Scénarios

| # | Story | Étapes | Attendu |
|---|---|---|---|
| 1 | US1 | Membre factice : tirer un code, retirer, envoyer le selfie avec l'ancien code | 410 et proposition d'un nouveau code |
| 2 | US1 | Envoyer avec le bon code ; ouvrir le cas côté admin | Code attendu, « lecture en cours », puis code lu ; trois questions ; aucun geste automatique |
| 3 | US2 | Refuser pour « code » ; ouvrir `/verify` côté membre | Motif, conseil, nouveau code ; 2ᵉ envoi = « tentative n° 2 » |
| 4 | US2 | Trois refus d'affilée | Tirage refusé, date de reprise affichée à J+24 h |
| 5 | US3 | Téléphone 360 px : filtrer « Signalés », ouvrir, revenir, recharger, copier le lien | Même état ; aucun défilement horizontal |
| 6 | US4 | Bannir depuis la fiche | Motif exigé, « Le membre verra… », journal identique à l'ancienne page |
| 7 | US4 | Ouvrir `/admin/reports` | Redirection vers `/admin/membres?filtre=report` |
| 8 | US5 | Trois gestes, en annuler un, couper le réseau, un quatrième, rétablir | Trois gestes appliqués une fois ; indicateur juste |
| 9 | US5 | « Toi » et « Sam » sur le même signalement | Second geste : « déjà traité par Toi » |
| 10 | US6 | Avertir ; se connecter comme le membre | Message une fois, puis plus rien |
| 11 | US6 | Masquer ; Découvrir d'un autre membre ; demander une relecture | Absent de Découvrir ; cas « relecture » dans « À traiter » |
| 12 | US7 | Activité sur 7, 30 et 90 j | Chiffres égaux au script de contrôle sur la base de démo ; phrases justes à 0 et 1 |
| 13 | US8 | Ouvrir chaque ancienne adresse admin | Redirection vers l'équivalent |
| 14 | Tous | Rejouer les cas hostiles de `securite.md` (M1 à M21) | Chaque attaque est refusée ; un test le prouve |

## Gate visuel (principe V)

Captures Playwright à 360, 768 et 1280 px, en clair et en sombre, de : Activité, Membres (liste et fiche), feuille de refus, Retours, Outils, page `/verify` (code, puis refus). On compare au prototype `proto-bureau.html`. Pour tester un recouvrement, on mesure plusieurs points de chaque élément, jamais son seul centre.
