# Specification Quality Checklist: Messagerie privée durable

**Purpose**: Valider la complétude et la qualité de la spec avant de passer au plan
**Created**: 2026-08-17
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] Aucun détail d'implémentation (langages, frameworks, API)
- [x] Centré sur la valeur pour les personnes et le besoin produit
- [x] Lisible par une partie prenante non technique
- [x] Toutes les sections obligatoires sont remplies

## Requirement Completeness

- [x] Aucun marqueur [NEEDS CLARIFICATION] restant — les 3 marqueurs (FR-013, FR-014, FR-015) ont été tranchés avec l'opérateur le 2026-08-17, cf. § Décisions tranchées.
- [x] Exigences testables et non ambiguës (hors les 3 ci-dessus)
- [x] Critères de succès mesurables
- [x] Critères de succès agnostiques de la technique
- [x] Scénarios d'acceptation définis pour chaque user story
- [x] Cas limites identifiés
- [x] Périmètre borné (hors périmètre explicite : pagination, déchiffrement paresseux, virtualisation — déjà livrés)
- [x] Dépendances et hypothèses identifiées

## Feature Readiness

- [x] Chaque exigence fonctionnelle a des critères d'acceptation clairs
- [x] Les user stories couvrent les parcours principaux
- [x] La feature répond aux résultats mesurables des Success Criteria
- [x] Aucun détail d'implémentation ne fuit dans la spécification

## Notes

- **Les cinq user stories sont planifiables.** Les 3 questions de rétention ont
  été tranchées le 2026-08-17 : conservation liée à la vie du match, effacement
  bilatéral avec pierre tombale, fils éphémères hors périmètre. US5 se réduit
  donc à rendre la purge **réelle** derrière un geste qui existe déjà.
- Vigilance charte : FR-010 et FR-011 traduisent le corollaire du principe III
  (une promesse affichée doit être adossée à du code et testée par route, #328).
  Livrer l'escrow sans la page Confidentialité fabriquerait précisément le défaut
  que #328 a corrigé ailleurs.
- Point d'exploitation à ne pas perdre au passage au plan : la gestion de la clé
  maître (génération, stockage, sauvegarde, rotation). Sa perte rend tous les
  messages irrécupérables — c'est le risque n°1 introduit par cette feature.
