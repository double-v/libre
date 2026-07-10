-- Préférences de recherche persistées (#235) : genre / orientation / centres
-- d'intérêt souhaités chez les autres. Colonnes additives avec défaut vide,
-- donc sans risque sur les lignes existantes (cf. dérive schéma↔DB : toujours
-- migrer une colonne ajoutée au schéma).
ALTER TABLE "profiles" ADD COLUMN     "searchGenders" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "profiles" ADD COLUMN     "searchOrientations" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "profiles" ADD COLUMN     "searchInterests" TEXT[] DEFAULT ARRAY[]::TEXT[];
