-- Spec 012, US1/US2 : selfie avec un code écrit à la main.
-- Additive seulement : les demandes au geste (`challenge`) restent lisibles (FR-008).

CREATE TABLE "verification_codes" (
    "user_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "tire_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expire_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "verification_codes_pkey" PRIMARY KEY ("user_id")
);

ALTER TABLE "verification_codes" ADD CONSTRAINT "verification_codes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "verification_requests"
    ADD COLUMN "code_attendu" TEXT,
    ADD COLUMN "code_lu" TEXT,
    ADD COLUMN "tentative" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN "sans_donnees_appareil" BOOLEAN,
    ADD COLUMN "vue_at" TIMESTAMP(3);
