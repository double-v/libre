-- Parcours d'accueil (spec 005).

-- 1. Prochaine étape à montrer : 0 photo, 1 ce que je cherche, 2 où, 3 terminé.
ALTER TABLE "profiles" ADD COLUMN "onboardingStep" INTEGER NOT NULL DEFAULT 0;

-- 2. Un compte sans ligne de profil n'existe pour personne dans Découvrir
--    (#342). On lui en donne une, vide : tous les autres champs ont un défaut
--    ou sont nullables, sauf les tableaux, qu'on pose explicitement.
INSERT INTO "profiles" ("userId", "orientation", "relationshipType", "interests", "photos", "updatedAt")
SELECT u.id, '{}', '{}', '{}', '{}', now()
FROM "users" u
LEFT JOIN "profiles" p ON p."userId" = u.id
WHERE p."userId" IS NULL;

-- 3. Décision opérateur (spec 005, FR-023) : un membre déjà inscrit ne voit
--    le parcours que si son profil est entièrement vide. Dès qu'il a une
--    photo, un type de relation ou une position, le parcours est réputé fait ;
--    seule la carte de relance s'applique. Idempotent.
UPDATE "profiles" SET "onboardingStep" = 3
WHERE "onboardingStep" = 0
  AND (cardinality("photos") > 0
       OR cardinality("relationshipType") > 0
       OR "last_geoloc_at" IS NOT NULL
       OR "city_label" IS NOT NULL);
