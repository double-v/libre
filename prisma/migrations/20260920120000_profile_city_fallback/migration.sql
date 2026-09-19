-- #402 : ville saisie à la main, repli de la géolocalisation.
-- Additif et nullable : aucun backfill, aucun verrou long sur `profiles`.
ALTER TABLE "profiles" ADD COLUMN "position_source" TEXT;
ALTER TABLE "profiles" ADD COLUMN "city_label" TEXT;
