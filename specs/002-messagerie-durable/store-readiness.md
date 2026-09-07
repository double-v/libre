# Plan store-readiness — 5 actions prioritaires

**Date** : 2026-08-28

**Objectif** : préparer Libre à un éventuel dépôt sur Google Play Store et Apple App Store, en restant dans une logique freetier et en tenant compte des contraintes d'une app de rencontre avec messagerie privée.

---

## 1. Bien positionner Libre comme "rencontre bienveillante", pas app adulte

**Pourquoi** : Apple et Google rejettent les apps principalement conçues pour du contenu adulte, du random chat anonyme, ou l'objectification ("hot-or-not"). Libre doit être perçue comme un service de rencontre respectueux entre adultes.

**Actions concrètes** :
- Réviser la description publique du site et de l'app future pour mettre en avant : "rencontre bienveillante", "respect", "pas de swipe addictif", "humain d'abord".
- Éviter les mots : "hookup", "anonyme", "sex", "hot", "match rapide", etc.
- Vérifier les screenshots et previews à venir : pas de contenu suggestif, pas de profils dénudés, ambiance chaleureuse mais non adulte.
- Documenter la charte éditoriale dans `PRODUCT.md` ou `DESIGN.md`.

**Coût freetier** : uniquement du temps de rédaction et de revue.

**Complexité** : faible.

**Ticket suggéré** : `#XXX` — Positionnement store-ready : charte éditoriale et assets.

---

## 2. Maintenir le flou par défaut sur les photos sensibles

**Pourquoi** : Google Play exige que les contenus à caractère sexuel indirect soient masqués par défaut et accessibles uniquement après plusieurs actions explicites. Apple interdit le contenu sexuellement explicite par défaut.

**Actions concrètes** :
- S'assurer que les photos classées sensibles sont floutées par défaut (déjà en place via `#330-#332`).
- Vérifier que la révélation nécessite une action volontaire et explicite.
- Ajouter un réglage utilisateur clair pour activer/désactiver l'affichage des photos sensibles.
- S'assurer que les photos sensibles ne sont jamais affichées dans les previews / screenshots du store.

**Coût freetier** : coût de stockage R2 du dérivé flouté (négligeable à 23 inscrits).

**Complexité** : faible (surtout de la vérification).

**Ticket suggéré** : `#XXX` — Vérification store du volet photos sensibles.

---

## 3. Avoir un age gate / vérification 18+ solide

**Pourquoi** : les stores interdisent l'accès aux mineurs pour les apps de rencontre. Une vérification robuste est nécessaire.

**Actions concrètes** :
- À l'inscription : saisie obligatoire de la date de naissance, calcul de l'âge, blocage si < 18 ans.
- Mention explicite dans les CGU : "réservé aux 18 ans et plus".
- Vérification d'identité optionnelle (selfie + pièce d'identité) pour obtenir un badge "vérifié".
- Si l'app native arrive : utiliser les APIs natives (LocalAuthentication, etc.) avec précaution.

**Coût freetier** : la vérification manuelle par selfie est gratuite (temps admin). Une vérification automatique tierce serait payante.

**Complexité** : moyenne (modifications inscription + modération).

**Ticket suggéré** : `#XXX` — Renforcement age gate 18+ et badge vérifié.

---

## 4. Mettre à jour la politique de confidentialité pour refléter le vault activable

**Pourquoi** : les stores et le RGPD exigent une privacy policy précise. Aujourd'hui la page dit "E2E, le serveur ne peut pas lire". Il faut ajouter la possibilité future d'activation du vault et les métadonnées collectées.

**Actions concrètes** :
- Réécrire la section "Données de communication" de `/confidentialite`.
- Mentionner :
  - messages chiffrés de bout en bout par défaut,
  - service ne peut pas lire actuellement,
  - vault activable avec notification préalable,
  - pas de rétroactivité sur les conversations existantes,
  - indicateurs de risque sur métadonnées (volume, signalements, patterns),
  - durée de conservation (tant que le match vit, puis fenêtre de modération).
- Mettre à jour les CGU en cohérence.
- Ajouter un test de non-régression sur la route `/confidentialite`.

**Coût freetier** : gratuit.

**Complexité** : moyenne (rédaction juridique + tests).

**Ticket suggéré** : `#XXX` — Mise à jour CGU/confidentialité pour vault activable.

---

## 5. Fournir un compte demo au review avec des conversations fictives

**Pourquoi** : Apple et Google demandent un accès complet à l'app lors du review, y compris un compte de test avec des fonctionnalités actives.

**Actions concrètes** :
- Créer un compte `demo@getlibre.fr` avec :
  - un profil complet,
  - plusieurs matchs fictifs,
  - des conversations fictives,
  - une photo sensible classée (pour montrer le flou),
  - un signalement test,
  - un accès aux paramètres.
- Fournir les identifiants dans les notes de review.
- Maintenir ce compte à jour à chaque nouvelle fonctionnalité.
- Veiller à ce que les données demo soient clairement fictives et ne croisent pas de vrais utilisateurs.

**Coût freetier** : gratuit (un compte supplémentaire dans la base).

**Complexité** : faible à moyenne (nécessite un seed/maintenance).

**Ticket suggéré** : `#XXX` — Compte demo et données de review.

---

## Tableau récapitulatif

| # | Action | Coût freetier | Complexité | Priorité | Dépendance |
|---|---|---|---|---|---|
| 1 | Positionnement bienveillant | Temps | Faible | Haute | Aucune |
| 2 | Flou photos sensibles | Négligeable | Faible | Haute | Photos explicites déjà livrées |
| 3 | Age gate 18+ | Temps admin | Moyenne | Haute | Aucune |
| 4 | Privacy policy vault | Temps | Moyenne | Haute | Spec 002 revue |
| 5 | Compte demo | Gratuit | Moyenne | Moyenne | Fonctionnalités stables |

---

## Recommandation de séquencement

```
1. Positionnement éditorial
2. Privacy policy + CGU (dépend de 1)
3. Age gate renforcé (peut être fait en parallèle)
4. Vérification flou photos (contrôle)
5. Compte demo (une fois 1-4 stables)
```

Ces cinq actions ne nécessitent pas de développement lourd. Elles sont largement du packaging, de la rédaction et de la vérification. Elles peuvent être menées en parallèle de l'implémentation technique du vault.
