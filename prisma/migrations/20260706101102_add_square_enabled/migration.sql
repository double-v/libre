-- Interrupteur global de La Place, activable/désactivable depuis l'admin.
-- Colonne en camelCase pour rester cohérente avec les colonnes existantes
-- de site_config (currentTheme, updatedAt…), qui sont physiquement camelCase.
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "squareEnabled" BOOLEAN NOT NULL DEFAULT true;
