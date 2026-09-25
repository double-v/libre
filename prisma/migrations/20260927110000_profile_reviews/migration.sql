-- Décisions sur les profils à vérifier (spec 006, #444). Table additive.
CREATE TABLE "profile_reviews" (
    "userId" UUID NOT NULL,
    "decision" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedBy" UUID,

    CONSTRAINT "profile_reviews_pkey" PRIMARY KEY ("userId")
);

-- La décision part avec le compte ; celle d'un admin supprimé reste, sans auteur.
ALTER TABLE "profile_reviews" ADD CONSTRAINT "profile_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "profile_reviews" ADD CONSTRAINT "profile_reviews_decidedBy_fkey" FOREIGN KEY ("decidedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
