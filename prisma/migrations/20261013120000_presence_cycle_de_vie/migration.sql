-- Spec 011 (#498) : présence au jour près et préavis d'inactivité, privés.
ALTER TABLE "users" ADD COLUMN "last_seen_at" DATE;
ALTER TABLE "users" ADD COLUMN "preavis_inactivite_at" TIMESTAMP(3);
CREATE INDEX "users_last_seen_at_idx" ON "users"("last_seen_at");

-- Amorçage : faute d'historique, un compte confirmé est réputé vu le jour de
-- la livraison. La règle « 1 an sans visite » part donc de cette date.
UPDATE "users" SET "last_seen_at" = CURRENT_DATE WHERE "emailVerified" IS NOT NULL;
