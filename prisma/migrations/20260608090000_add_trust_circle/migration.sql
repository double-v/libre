-- CreateTable
CREATE TABLE "trust_levels" (
    "userId" UUID NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "band" TEXT NOT NULL DEFAULT 'newcomer',
    "factors" JSONB NOT NULL DEFAULT '{}',
    "lastComputedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trust_levels_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "trust_contacts" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "contactId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trust_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_checkins" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "last_lat" DOUBLE PRECISION,
    "last_lng" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "safety_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkin_alerts" (
    "id" UUID NOT NULL,
    "checkinId" UUID NOT NULL,
    "contactId" UUID NOT NULL,
    "deliveryStatus" TEXT NOT NULL DEFAULT 'queued',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkin_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trust_levels_band_idx" ON "trust_levels"("band");

-- CreateIndex
CREATE UNIQUE INDEX "trust_contacts_ownerId_contactId_key" ON "trust_contacts"("ownerId", "contactId");

-- CreateIndex
CREATE INDEX "trust_contacts_ownerId_idx" ON "trust_contacts"("ownerId");

-- CreateIndex
CREATE INDEX "trust_contacts_contactId_idx" ON "trust_contacts"("contactId");

-- CreateIndex
CREATE INDEX "safety_checkins_userId_status_idx" ON "safety_checkins"("userId", "status");

-- CreateIndex
CREATE INDEX "safety_checkins_expiresAt_status_idx" ON "safety_checkins"("expiresAt", "status");

-- CreateIndex
CREATE INDEX "checkin_alerts_checkinId_idx" ON "checkin_alerts"("checkinId");

-- CreateIndex
CREATE INDEX "checkin_alerts_contactId_idx" ON "checkin_alerts"("contactId");

-- AddForeignKey
ALTER TABLE "trust_levels" ADD CONSTRAINT "trust_levels_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_contacts" ADD CONSTRAINT "trust_contacts_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_contacts" ADD CONSTRAINT "trust_contacts_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_checkins" ADD CONSTRAINT "safety_checkins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkin_alerts" ADD CONSTRAINT "checkin_alerts_checkinId_fkey" FOREIGN KEY ("checkinId") REFERENCES "safety_checkins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
