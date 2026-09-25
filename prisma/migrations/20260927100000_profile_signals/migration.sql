-- Indices de faux profils (spec 006, #443). Table et colonne additives,
-- écrites à la main : la migration part en prod au déploiement.
CREATE TABLE "profile_signals" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "force" TEXT NOT NULL,
    "extrait" TEXT,
    "photoKey" TEXT,
    "autreUserId" UUID,
    "cle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_signals_pkey" PRIMARY KEY ("id")
);

-- Un signal par contenu et par compte : le même indice ne rouvre pas un dossier tranché.
CREATE UNIQUE INDEX "profile_signals_userId_cle_key" ON "profile_signals"("userId", "cle");
CREATE INDEX "profile_signals_createdAt_idx" ON "profile_signals"("createdAt");

-- Les signaux partent avec le compte.
ALTER TABLE "profile_signals" ADD CONSTRAINT "profile_signals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Mise en retrait : nullable, aucun compte existant n'est touché.
ALTER TABLE "users" ADD COLUMN "retraitAt" TIMESTAMP(3);
