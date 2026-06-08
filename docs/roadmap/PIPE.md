# Pipe de tâches — état actuel

> Le pipe que tu/moi/sub-agent peut piocher. Synchronisé avec
> GitHub Issues.

## ✅ Décision tranchée

| # | Décision | Statut |
|---|---|---|
| #43 | **A. V1 = Libre-only** (pas de contacts hors-app en V1) | ✅ Fermée |

## 🟢 Prêt à piocher (Phase 1 — Fondation API)

| # | Titre | Size | Dépendances |
|---|---|---|---|
| # | Titre | Size | Dépendances | Statut |
|---|---|---|---|---|
| ✅ #44 | db Schema TrustCircle (4 tables) | S | — | FERMÉ (commit `8e671bb`) |
| ✅ #45 | api Validators Zod pour TrustContact | S | — | FERMÉ (commit `df0cfa1`) |
| ✅ #46 | api GET /api/circle/contacts | S | #44 ✅ | FERMÉ (commit `a022846`) |
| ✅ #47 | api POST /api/circle/contacts | M | #44 ✅ + #45 ✅ | FERMÉ (commit `a022846`) |
| ✅ #48 | api DELETE /api/circle/contacts/:id | S | #46 ✅ | FERMÉ (commit `a022846`) |
| ✅ #49 | api Validators Zod pour SafetyCheckin | S | #44 ✅ | FERMÉ |
| 🎉 **Phase 1** | **100% complète** | **~10h** | — | **4/4 tickets fermés** |
| 🟢 #50 | api POST /api/circle/check-in (démarrer) | M | #44 + #49 + #46 | ready |

## 🟡 Prêt mais à planifier (Phase 2 — Check-in + cron)

| # | Titre | Size | Bloqué par |
|---|---|---|---|
| #49 | api Validators Zod pour SafetyCheckin | S | #44 |
| #50 | api POST /api/circle/check-in (démarrer) | M | #44 + #49 + #46 (besoin d'1 contact) |
| #51 | api Lifecycle : validate, cancel, get active | M | #50 |
| #52 | cron Vercel scanExpiredCheckins | L | #51 |
| #53 | lib Interface notifyContact (stub V1) | S | — |

## 🟠 Prêt mais à planifier (Phase 3 — Trust + UI)

| # | Titre | Size | Bloqué par |
|---|---|---|---|
| #54 | lib computeTrustLevel | L | #44 |
| #55 | ui TrustBadge | M | #54 |
| #56 | api GET /api/trust/level | S | #54 |
| #57 | ui Page /settings/trust | L | #46 + #47 + #48 + #54 + #56 |
| #58 | ui CheckinButton | L | #50 + #51 |
| #59 | ui TrustBadge sur Discover/Matches/Profile | M | #55 |

## 🔵 Prêt mais à planifier (Phase 4 — Polish)

| # | Titre | Size | Bloqué par |
|---|---|---|---|
| #60 | admin Page alertes /admin/circle/alerts | L | #52 |
| #61 | doc Page "Comment ça marche" du Cercle | M | — |
| #62 | a11y Audit complet du Chantier 01 | L | #57 + #58 |
| #63 | e2e Tests Playwright (4 scénarios) | XL | #25 (setup Playwright local) + tout le reste |

## 📊 Récap

- **Total tickets** : 21 (1 décision + 5 Phase 1 + 5 Phase 2 + 6 Phase 3 + 5 Phase 4)
- **Effort total** : ~34h (= 2-3 semaines solo)
- **Tickets bloqués** : 2 (#43, #44)
- **Tickets ready** : 19
- **Plus gros chantier** : Phase 3 UI (~13.5h, ~40% de l'effort)
- **Plus petite tâche** : 0.5h (#45, #48, #49, #53, #56)

## 🎯 Stratégie de pioche recommandée

1. **Trancher #43** (2 min, choix A recommandé)
2. **Débloquer #44** (1h, schema)
3. **Attaquer en parallèle #45 et #49** (validators, indépendants)
4. **Enchaîner Phase 1** : #46, #47, #48 (3-4h)
5. **Pause**, faire un test E2E rapide du flow Cercle
6. **Phase 2** (#49, #50, #51, #52, #53) : ~6h
7. **Phase 3** (#54, #55, #56, #57, #58, #59) : ~13.5h
8. **Phase 4** (#60, #61, #62, #63) : ~10.5h

## 🔌 Commandes utiles

### Voir le pipe ready

```bash
gh issue list --repo double-v/libre \
  --label "roadmap,chantier:01-securite,ready" \
  --state open
```

### Piocher un ticket

1. S'auto-assigner : `gh issue edit <N> --add-assignee @me`
2. Retirer `ready`, ajouter `in-progress` (label à créer)
3. Travailler dans une branche `chantier-01/<ticket>-<slug>`
4. PR avec `Closes #<N>` dans le body
5. Au merge : GitHub ferme le ticket auto

### Sync ce fichier

À chaque fin de sprint (chaque ticket fermé), re-générer ce PIPE.md
depuis GitHub. Ou utiliser un script `scripts/sync-pipe.sh` (à créer).
