-- Modération des réponses (spec 009, revue de la PR #466). Colonnes
-- additives, nulles ou vides par défaut : aucune donnée existante touchée.

-- 1. Ce que la modération a retiré, gardé pour refuser une republication à
--    l'identique et pour signaler à l'admin une réécriture après retrait.
ALTER TABLE "profile_answers" ADD COLUMN "removedText" TEXT;
ALTER TABLE "profile_answers" ADD COLUMN "removedChoices" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "profile_answers" ADD COLUMN "removedAt" TIMESTAMP(3);

-- 2. Les réponses publiées du profil signalé, copiées au moment du
--    signalement : la personne signalée ne peut plus effacer la preuve.
ALTER TABLE "reports" ADD COLUMN "answersSnapshot" JSONB;
