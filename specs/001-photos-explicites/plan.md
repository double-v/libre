# Plan d'implémentation — Photos explicites

**Spec** : [spec.md](./spec.md) · **Créé** : 2026-08-15 · **Constitution** : v1.0.0

## Contrôle de constitution

| Principe | Impact | Verdict |
|---|---|---|
| I — humain d'abord | La feature réduit une exposition subie ; elle n'ajoute aucun ressort d'engagement. | ✅ |
| II — français, copie non excluante | Toute la copie est à écrire en français, sans jugement moral sur qui publie ce contenu. | ✅ à surveiller en revue de copie |
| III — vie privée, fermé par défaut | FR-004 et FR-006 en sont l'application directe : refus par défaut, application **côté serveur**, test de non-régression par route. | ✅ cœur du design |
| IV — Design System | Un composant neuf (photo floutée + action « Voir ») → à proposer dans `DESIGN.md` avant de coder. | ⚠️ tâche dédiée |
| V — le pixel juge | Nouvelle surface visuelle → prototype validé, puis vérification sur l'app servie. | ⚠️ deux gates obligatoires |
| VI — ticket / checkpoint | 3 user stories → 3 issues. Livraison en **une PR** (déploiement unique demandé par l'opérateur), chaque story restant un commit distinct et relisible. | ✅ |

Aucune dérogation demandée.

## Décision structurante : où vit la classification

`Profile.photos` est un `String[]` de clés R2 (`userId/uuid.ext`), sans identité
par photo. Trois options ont été pesées :

1. **Modèle `Photo` complet** (id, rang, clé, classification…) et migration du
   tableau. Propre sur le papier, mais réécrit tout le code qui manipule
   `photos` — upload, retrait, promotion d'avatar, export RGPD, admin, feed —
   pour une feature qui n'a besoin que d'une métadonnée. Blast radius sans
   rapport avec le besoin.
2. **Tableau parallèle** `photoSensitivity[]` aligné par index. Rejeté : FR-010
   exige que la classification survive au retrait d'une photo, et un retrait
   décale tous les index. On perdrait la classification en silence — exactement
   la classe de bug qu'on ne voit qu'en production.
3. **Table annexe indexée par la clé R2** ✅ **retenue**. La clé est déjà unique
   et stable (`crypto.randomUUID()` à l'upload) et ne bouge ni au
   réordonnancement ni au retrait d'une autre photo. FR-010 est satisfait *par
   construction*, et le code existant n'a rien à changer : seuls les points qui
   **servent** ou **affichent** une photo font une jointure.

### Entité `PhotoModeration`

| Champ | Rôle |
|---|---|
| `key` (PK) | clé R2 de l'original — jointure naturelle avec `Profile.photos` |
| `ownerId` | propriétaire, pour purger à la suppression de compte (cascade) |
| `sensitivity` | `suggestive` \| `explicit` (une ligne n'existe que si classée) |
| `blurredKey` | clé R2 du dérivé flouté |
| `classifiedBy` | admin auteur, ou `null` si auto-déclaration |
| `classifiedAt`, `reason` | traçabilité ; motif obligatoire côté admin |

L'absence de ligne vaut « ordinaire » : pas de rétro-remplissage à faire, et le
défaut est le comportement d'aujourd'hui.

## Chaîne de service — le point qui fait la garantie

Tout passe par `/api/photos/[key]`, déjà en place (proxy → URL signée R2). La
décision s'ajoute **après** le contrôle d'accès existant, jamais à sa place :

```
1. garde actuelle : propriétaire → tout ; photos[0] → tout connecté ;
   photos 1..n → matches ; admin → tout, journalisé (VIEW_PRIVATE_PHOTO)
2. NOUVEAU : la photo est-elle classée ?
   ├── non                         → URL signée de l'original
   ├── propriétaire ou admin       → original (FR-005)
   ├── viewer consentant à ce niveau → original (FR-006)
   ├── `?reveal=1` (clic « Voir ») → original (décision 2, FR-008)
   └── sinon                       → URL signée du DÉRIVÉ FLOUTÉ
```

`?reveal=1` n'est pas un contournement : puisque « Voir » fonctionne toujours,
ce paramètre **est** le geste de consentement ponctuel. La propriété qui compte
est conservée — sans action explicite, l'original n'est jamais transmis.

Le réglage du lecteur est un **seuil** : `none` < `suggestive` < `explicit`. On
sert l'original si `niveau_photo <= seuil_lecteur`.

## Génération du dérivé flouté

- `sharp` (déjà présent en transitif via Next ; **à passer en dépendance
  explicite** — dépendre d'un transitif est un piège de mise à jour).
- Au classement : télécharger l'original depuis R2, réduire fortement puis
  flouter (le sous-échantillonnage détruit l'information, le flou seul est
  partiellement réversible), réuploader sous `<clé>.blur.<ext>`.
- Best-effort **inversé** : contrairement aux effets de bord habituels
  (principe « post-persist »), si la génération du flou échoue, le classement
  **doit** échouer aussi — classer sans pouvoir flouter donnerait une garantie
  vide. On écrit la ligne `PhotoModeration` seulement après un dérivé disponible.
- Au déclassement et au retrait de photo : supprimer le dérivé, best-effort
  cette fois (un objet orphelin ne blesse personne).

## Découpage en tâches

Voir [tasks.md](./tasks.md). Trois lots alignés sur les user stories, chacun
livrable et testable seul.

## Risques

| Risque | Parade |
|---|---|
| Le flou n'est pas assez fort et la photo reste lisible | Réduction agressive **avant** flou ; vérification sur pixels réels, pas sur la présence d'un filtre. |
| `sharp` indisponible dans le runtime Vercel | Dépendance explicite + `next build` local avant PR (la CI ne le lance pas). |
| Le cache privé de 15 min sert un original déjà obtenu | Assumé et documenté (spec, § Edge Cases) : la classification prend effet au prochain accès. |
| Régression sur le modèle d'accès existant | La suite `/api/photos/[key]` de #323 reste verte, sans modification de ses assertions. |
| L'admin voit une galerie floutée et ne peut plus modérer | L'admin reçoit toujours l'original (FR-005 étendu), franchissement déjà journalisé. |
