-- Empreintes de photos (spec 006, #445). Tables additives.
CREATE TABLE "photo_fingerprints" (
    "photoKey" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "hash" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photo_fingerprints_pkey" PRIMARY KEY ("photoKey")
);
CREATE INDEX "photo_fingerprints_userId_idx" ON "photo_fingerprints"("userId");
-- L'empreinte part avec le compte.
ALTER TABLE "photo_fingerprints" ADD CONSTRAINT "photo_fingerprints_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Empreintes des comptes bannis : sans clé étrangère, purgées après un an.
CREATE TABLE "banned_photo_fingerprints" (
    "id" UUID NOT NULL,
    "hash" BIGINT NOT NULL,
    "bannedUserId" UUID NOT NULL,
    "bannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banned_photo_fingerprints_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "banned_photo_fingerprints_bannedAt_idx" ON "banned_photo_fingerprints"("bannedAt");
