-- Filtre de distance du feed de découverte (#327).
--
-- Colonne NULLABLE sans défaut, et c'est délibéré : NULL = « partout ». On ne
-- réutilise pas `maxDistanceKm` (rayon du segment « À proximité », qui vaut 50
-- chez tous les comptes existants) parce que le filtre s'applique désormais
-- aussi au feed « Pour toi » : hériter du 50 aurait rétréci le feed de tout le
-- monde du jour au lendemain, sans que personne n'ait rien demandé.
ALTER TABLE "profiles" ADD COLUMN "searchDistanceKm" INTEGER;

-- Un rayon différent du défaut ne peut venir que d'un choix explicite : on le
-- reprend comme filtre, pour que personne ne voie son réglage effacé. Les
-- profils restés à 50 gardent NULL — un défaut n'est pas une préférence.
UPDATE "profiles" SET "searchDistanceKm" = "maxDistanceKm" WHERE "maxDistanceKm" <> 50;

-- Le filtre pousse une bounding box lat/lng dans le WHERE : sans index, chaque
-- page de feed déclenche un seq scan.
CREATE INDEX IF NOT EXISTS "profiles_last_known_lat_last_known_lng_idx"
  ON "profiles" ("last_known_lat", "last_known_lng");
