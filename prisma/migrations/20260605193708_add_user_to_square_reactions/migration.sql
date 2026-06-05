-- DropForeignKey (no FK to drop, messageId FK is preserved; not changing it)
-- Step 1: Truncate existing reactions. Reactions are an ephemeral P1 feature,
-- data loss is acceptable (GH issue #15). The new schema requires a userId,
-- and we do not invent fake userIds for existing anonymous aggregates.
TRUNCATE TABLE "square_reactions";

-- DropIndex
DROP INDEX "square_reactions_messageId_emoji_key";

-- AlterTable
ALTER TABLE "square_reactions" DROP COLUMN "count",
DROP COLUMN "updatedAt",
ADD COLUMN "userId" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "square_reactions_messageId_idx" ON "square_reactions"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "square_reactions_messageId_emoji_userId_key" ON "square_reactions"("messageId", "emoji", "userId");

-- AddForeignKey
ALTER TABLE "square_reactions" ADD CONSTRAINT "square_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
