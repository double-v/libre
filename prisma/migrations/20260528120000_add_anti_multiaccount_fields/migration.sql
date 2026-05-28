-- AlterTable: add anti-multi-account fields
ALTER TABLE "users" ADD COLUMN "normalizedEmail" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "emailVerified" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "deviceId" TEXT;

-- Backfill normalizedEmail from existing email
UPDATE "users" SET "normalizedEmail" = LOWER("email");

-- Create unique index on normalizedEmail
ALTER TABLE "users" ADD CONSTRAINT "users_normalizedEmail_key" UNIQUE ("normalizedEmail");