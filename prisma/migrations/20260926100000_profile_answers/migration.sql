-- Réponses aux questions de profil (spec 009). Table additive ; la banque de
-- questions vit dans le code, on ne stocke que ses clés.
CREATE TABLE "profile_answers" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "questionKey" TEXT NOT NULL,
    "choices" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "text" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'published',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_answers_pkey" PRIMARY KEY ("id")
);

-- Une réponse par question et par membre.
CREATE UNIQUE INDEX "profile_answers_userId_questionKey_key" ON "profile_answers"("userId", "questionKey");
CREATE INDEX "profile_answers_userId_idx" ON "profile_answers"("userId");

-- Les réponses partent avec le compte (FR-013).
ALTER TABLE "profile_answers" ADD CONSTRAINT "profile_answers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
