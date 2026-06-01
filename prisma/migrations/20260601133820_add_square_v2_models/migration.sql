-- AlterTable
ALTER TABLE "square_messages" ADD COLUMN     "isSystem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "themeConfigId" UUID;

-- CreateTable
CREATE TABLE "square_theme_configs" (
    "id" UUID NOT NULL,
    "themeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "inputType" TEXT NOT NULL,
    "placeholder" TEXT NOT NULL,
    "maxLength" INTEGER NOT NULL DEFAULT 200,
    "allowFreeText" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "pseudonymNames" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "square_theme_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "square_theme_schedule" (
    "id" UUID NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "themeConfigId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "square_theme_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banned_words" (
    "id" UUID NOT NULL,
    "word" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'block',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banned_words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "square_reactions" (
    "id" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "emoji" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "square_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "square_message_reports" (
    "id" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "reporterId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "square_message_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "square_theme_configs_themeId_key" ON "square_theme_configs"("themeId");

-- CreateIndex
CREATE UNIQUE INDEX "square_theme_schedule_dayOfWeek_key" ON "square_theme_schedule"("dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "banned_words_word_key" ON "banned_words"("word");

-- CreateIndex
CREATE UNIQUE INDEX "square_reactions_messageId_emoji_key" ON "square_reactions"("messageId", "emoji");

-- CreateIndex
CREATE INDEX "square_message_reports_status_idx" ON "square_message_reports"("status");

-- AddForeignKey
ALTER TABLE "square_messages" ADD CONSTRAINT "square_messages_themeConfigId_fkey" FOREIGN KEY ("themeConfigId") REFERENCES "square_theme_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "square_theme_schedule" ADD CONSTRAINT "square_theme_schedule_themeConfigId_fkey" FOREIGN KEY ("themeConfigId") REFERENCES "square_theme_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "square_reactions" ADD CONSTRAINT "square_reactions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "square_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "square_message_reports" ADD CONSTRAINT "square_message_reports_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "square_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "square_message_reports" ADD CONSTRAINT "square_message_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
