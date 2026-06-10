# Roadmap Libre

> La direction du produit sur 6-12 mois. Pas un planning d'exécution : un
> **nord** pour ne pas perdre le sens quand on a 50 tickets à traiter.

## Lire dans cet ordre

1. **[VISION.md](./VISION.md)** — Ce que Libre veut être. 5 min de lecture,
   à relire quand on doute d'une feature.
2. **[PRINCIPES.md](./PRINCIPES.md)** — Les 5 règles non-négociables que
   chaque feature doit passer. Le test de cohérence.
3. **[chantiers/](./chantiers/)** — Un dossier par chantier. Chaque
   chantier a :
   - `spec.md` — Pourquoi, pour qui, ce que ça change
   - `plan.md` — Comment on l'attaque, tâches découpées
4. **[PIPE.md](./PIPE.md)** — Le pipe actuel : ce qui est prêt à être
   pioché, ce qui est en cours, ce qui attend.

## Le pipe en une image

```
VISION.md
   ↓ (filtre)
PRINCIPES.md
   ↓ (décline en)
chantiers/*/spec.md
   ↓ (décompose en)
chantiers/*/plan.md
   ↓ (atomise en)
Issues GitHub [type:task, ready]
   ↓ (pioché par)
Toi / moi / sub-agent
   ↓ (ferme avec)
PR + merge
   ↓ (remet à jour)
PIPE.md
```

## Convention de nommage des issues

```
[chantier-XX] [composant] Action en français impératif
```

Exemples :
- `[chantier-01] db Ajouter TrustCircle + TrustContact tables`
- `[chantier-01] api POST /api/circle/check-in endpoint`
- `[chantier-02] ui Calendrier hebdo La Place sur /square`

## Labels clés

- `roadmap` : ce ticket est rattaché à un chantier roadmap
- `chantier:01-securite` à `chantier:07-monetisation` : le chantier parent
- `type:spec` / `type:task` / `type:chore`
- `ready` : peut être pioché immédiatement
- `blocked` : bloqué par un autre ticket
- `needs-spec` : trop flou pour être estimé, nécessite une spec d'abord

## État actuel

| Chantier | Spec | Plan | Tâches | Statut |
|---|---|---|---|---|
| 01 — Sécurité (Vérif + Cercle de Confiance) | ✅ | ✅ | 🔄 | En cours de découpage |
| 02 — La Place comme rituel | 📝 | — | — | Spéculé |
| 03 — Prompts FR + Intentions | 📝 | — | — | Spéculé |
| 04 — Onboarding pacte | 📝 | — | — | Spéculé |
| 05 — Narration des Croisements | 📝 | — | — | Spéculé |
| 06 — UGC communautaire | 📝 | — | — | Spéculé |
| 07 — Monétisation éthique | 📝 | — | — | Spéculé |
| 08 — Home page redesign | 📝 | — | — | Spéculé (issue #66, besoin d'inputs) |

Légende : ✅ = existe / 🔄 = en cours / 📝 = spéculé, à formaliser / — = pas commencé
