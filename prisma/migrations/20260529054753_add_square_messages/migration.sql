-- CreateTable
CREATE TABLE "square_messages" (
    "id" UUID NOT NULL,
    "pseudonym" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "square_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "square_messages_createdAt_idx" ON "square_messages"("createdAt");
