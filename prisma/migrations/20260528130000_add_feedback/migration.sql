CREATE TABLE "feedback" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID,
    "category" TEXT NOT NULL DEFAULT 'bug',
    "message" TEXT NOT NULL,
    "url" TEXT,
    "userAgent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "feedback_status_idx" ON "feedback"("status");
CREATE INDEX "feedback_createdAt_idx" ON "feedback"("createdAt");