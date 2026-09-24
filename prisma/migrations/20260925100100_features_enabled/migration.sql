-- Fonctionnalités coupées par défaut (spec 007, R4). Colonne camelCase comme
-- le reste de site_config (pas de @map). Vide = tout ce qui est coupé par
-- défaut le reste : aucune donnée à reprendre.
ALTER TABLE "site_config" ADD COLUMN "featuresEnabled" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
