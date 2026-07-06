-- Fixe la dérive schéma/DB : le champ Profile.lastGeolocAt (@map "last_geoloc_at")
-- a été ajouté au schéma dans #153/#172 (geoloc privacy) sans migration.
-- La colonne manquante faisait planter tout profile.findMany (500 sur /api/discover).
ALTER TABLE "profiles" ADD COLUMN "last_geoloc_at" TIMESTAMP(3);
