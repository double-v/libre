-- Classification de sensibilité des photos (#330).
--
-- Table annexe indexée par la clé R2 plutôt qu'un modèle `Photo` complet : la
-- clé est déjà unique et stable, donc la classification survit au
-- réordonnancement et au retrait d'une autre photo du profil, sans réécrire
-- tout le code qui manipule `profiles.photos`.
--
-- L'absence de ligne vaut « ordinaire » : aucune donnée à rétro-remplir, et le
-- défaut reproduit exactement le comportement d'avant la feature.
CREATE TABLE "photo_moderation" (
    "key" TEXT NOT NULL,
    "ownerId" UUID NOT NULL,
    "sensitivity" TEXT NOT NULL,
    "blurredKey" TEXT NOT NULL,
    "classifiedBy" UUID,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photo_moderation_pkey" PRIMARY KEY ("key")
);

-- Purger les classifications d'un compte supprimé : une clé orpheline pointerait
-- sur un objet R2 lui-même supprimé.
ALTER TABLE "photo_moderation" ADD CONSTRAINT "photo_moderation_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Lecture par profil : l'affichage d'une galerie demande toutes les
-- classifications d'un propriétaire d'un coup.
CREATE INDEX "photo_moderation_ownerId_idx" ON "photo_moderation"("ownerId");
