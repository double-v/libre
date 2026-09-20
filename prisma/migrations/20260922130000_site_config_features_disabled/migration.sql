-- Interrupteurs de fonctionnalités (#418). Colonne = nom du champ, sans @map
-- (cf. incident « thème de site cassé en prod »). Vide = tout activé.
ALTER TABLE "site_config" ADD COLUMN "featuresDisabled" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
