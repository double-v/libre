-- #477 : l'équipe peut répondre à un retour ; l'auteur lit la réponse dans l'app.
ALTER TABLE "feedback" ADD COLUMN "reply" TEXT;
ALTER TABLE "feedback" ADD COLUMN "repliedAt" TIMESTAMP(3);
ALTER TABLE "feedback" ADD COLUMN "repliedBy" UUID;
ALTER TABLE "feedback" ADD COLUMN "replyReadAt" TIMESTAMP(3);

-- « Mes retours » et le point de non-lu lisent par auteur.
CREATE INDEX "feedback_userId_idx" ON "feedback"("userId");
