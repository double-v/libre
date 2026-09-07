# Brief juridique et store-readiness — Messagerie Libre

**Date** : 2026-08-28

**Contexte** : Libre est une application de rencontre web (PWA potentielle, future app native éventuelle) avec messagerie privée. La posture actuelle est le chiffrement de bout en bout pur. Un vault centralisé est prévu comme capacité activable pour la portabilité, la modération et la conformité éventuelle.

**Destinataires** : ce document est un support de discussion avec un juriste spécialisé en droit numérique, et avec l'opérateur pour la stratégie store-readiness.

---

## 1. Questions juridiques pour le conseil

### 1.1 Obligation de conservation / accès au contenu des messages

**Question principale** : en tant qu'hébergeur de messagerie privée, sommes-nous juridiquement tenus de pouvoir fournir le **contenu** des messages en cas de réquisition judiciaire ou d'enquête administrative ?

**Contexte** :
- Libre héberge des messages chiffrés de bout en bout.
- Techniquement, en mode E2E pur, le service ne peut pas lire les messages.
- Un vault activable permettrait au service de déchiffrer les messages créés après activation.

**Sous-questions** :
- La LCEN (art. 6-2, 6-4) impose-t-elle la conservation du contenu des messages, ou seulement des données de connexion et des métadonnées ?
- Quelle est la jurisprudence française / européenne récente sur la conservation des messages chiffrés ?
- Un service qui *peut* techniquement déchiffrer (vault actif) est-il plus exposé aux réquisitions qu'un service qui ne peut pas (E2E pur) ?
- Existe-t-il une obligation de "détection active" de contenus illicites (CSAM, terrorisme) pour les messageries privées en France ou en Europe ?

### 1.2 Durée de conservation des messages après rupture de match / suppression de compte

**Question** : quelle durée de conservation post-rupture / post-suppression est légalement acceptable et prudentielle ?

**Contexte** :
- Les messages sont conservés tant que le match vit (position actuelle).
- Après rupture ou suppression, on souhaite une fenêtre de conservation courte pour la modération et les éventuelles réquisitions, puis une purge effective.
- Placeholders envisagés : 30 jours, 90 jours, 1 an.

**Sous-questions** :
- Quelle durée minimale est recommandée pour répondre à une éventuelle réquisition ou procédure ?
- Quelle durée maximale reste compatible avec le RGPD (principe de minimisation) ?
- La conservation d'un ciphertext chiffré (illisable sans la clé maître) est-elle traitée différemment d'un contenu en clair ?

### 1.3 Transparence et CGU

**Question** : la mention "vault activable" dans les CGU est-elle juridiquement suffisante ?

**Sous-questions** :
- Faut-il obtenir un consentement explicite des utilisateurs au moment de l'activation du vault ?
- La simple notification (e-mail + bandeau) est-elle suffisante, ou faut-il une nouvelle acceptation des CGU ?
- Peut-on prévoir dans les CGU actuelles que le mode de chiffrement peut évoluer, sans demander une nouvelle acceptation à chaque fois ?

### 1.4 Responsabilité de l'administrateur unique / bénévole

**Question** : en tant que projet porté par des bénévoles sans structure juridique formelle, quelle est la responsabilité de l'administrateur technique en cas de :
- fuite de données,
- accès non autorisé au vault,
- réquisition judiciaire ?

**Sous-questions** :
- Faut-il constituer une association ou une structure légale avant d'activer le vault ?
- Quelles assurances / clauses limitatives sont recommandables dans les CGU ?

### 1.5 RGPD et export des données

**Question** : le droit d'accès / portabilité (art. 15, 20 RGPD) s'applique-t-il au contenu des messages ?

**Sous-questions** :
- En mode E2E pur, l'export RGPD des messages est impossible si la clé locale est perdue. Comment justifier cela ?
- En mode vault, l'export doit inclure les messages lisibles. Quelle base légale pour le stockage de la clé privée au coffre ?

---

## 2. Store-readiness : prérequis Play Store et App Store

### 2.1 Google Play — points clés pour Libre

| Exigence | État actuel | Action requise |
|---|---|---|
| CGU acceptées avant création de contenu | ✅ | Maintenir |
| Système de signalement intégré | ✅ | Maintenir |
| Fonction de blocage entre utilisateurs | ✅ | Vérifier / maintenir |
| Modération efficace et continue | ⚠️ Réactive, un seul admin | Documenter la procédure, prévoir des indicateurs de risque |
| Filtre par défaut sur contenus sexuels indirects | ⚠️ Photos sensibles | S'assurer que le flou est actif par défaut et la révélation explicite |
| Age gate / interdiction aux mineurs | ✅ 18+ dans CGU | Renforcer à l'inscription (date de naissance + vérification) |

**Risque principal** : si l'app est perçue comme une app à contenu adulte, elle peut être refusée ou retirée. Le positionnement doit rester "rencontre bienveillante".

### 2.2 Apple App Store — points clés pour Libre

| Exigence | État actuel | Action requise |
|---|---|---|
| Modération proactive + signalement + blocage | ⚠️ | Documenter et renforcer |
| Pas de contenu sexuellement explicite par défaut | ⚠️ | Maintenir le flou par défaut |
| Pas d'app "hookup / random chat / hot-or-not" | ✅ | Vérifier le marketing et les screenshots |
| Politique de confidentialité détaillée | ⚠️ | Mettre à jour avec le vault activable |
| Compte demo pour le review | ❌ | Prévoir |
| Contact support publié | ✅ | Maintenir |

**Risque principal** : Apple est plus strict sur le contenu sexuel et le positionnement. Il faut éviter tout ce qui ressemble à une app de rencontre adulte.

---

## 3. Recommandations opérationnelles

### Immédiat (avant tout code du vault)

1. **Prendre l'avis d'un juriste** sur les questions 1.1 à 1.5.
2. **Mettre à jour les CGU et la politique de confidentialité** pour refléter le mode E2E actuel et la possibilité d'activation du vault.
3. **Rédiger la procédure d'activation du vault** : qui décide, comment, quand, avec quelle notification.

### Court terme

4. **Implémenter les indicateurs de risque** en mode E2E (métadonnées uniquement).
5. **Renforcer l'age gate** : date de naissance + vérification d'identité optionnelle.
6. **Préparer le compte demo** pour le review futur.

### Moyen terme

7. **Évaluer AWS KMS free tier** ou un équivalent pour remplacer le stockage Vercel env de la clé maître.
8. **Constituer une structure juridique** si le service grandit ou si le vault est activé.

---

## 4. Hypothèses et attentes

- Le service restera en freetier et géré par un seul administrateur à court terme.
- L'activation du vault n'est pas prévue immédiatement ; elle reste une capacité technique.
- La conformité store n'est pas un objectif immédiat mais doit être préparée progressivement.
