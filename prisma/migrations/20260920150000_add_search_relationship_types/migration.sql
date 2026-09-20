-- Filtre de recherche par type de relation (#409).
--
-- Même modèle que `searchOrientations` : tableau vide = aucune restriction.
-- Additive et avec défaut, donc sans effet sur les comptes existants : personne
-- ne voit son feed rétrécir tant qu'il n'a pas touché au filtre.
ALTER TABLE "profiles" ADD COLUMN "searchRelationshipTypes" TEXT[] DEFAULT ARRAY[]::TEXT[];
