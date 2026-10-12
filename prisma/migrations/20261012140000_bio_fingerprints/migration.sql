-- CreateTable
CREATE TABLE "bio_fingerprints" (
    "userId" UUID NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bio_fingerprints_pkey" PRIMARY KEY ("userId","hash")
);

-- CreateIndex
CREATE INDEX "bio_fingerprints_hash_idx" ON "bio_fingerprints"("hash");

-- AddForeignKey
ALTER TABLE "bio_fingerprints" ADD CONSTRAINT "bio_fingerprints_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
