-- Journal « Où en est Libre » (spec 007, #351). Table neuve, additive.
CREATE TABLE "journal_posts" (
    "id" UUID NOT NULL,
    "slug" TEXT,
    "titre" TEXT NOT NULL,
    "corps" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'brouillon',
    "publieeAt" TIMESTAMP(3),
    "modifieeAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auteurId" UUID,
    "commentsOpen" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "journal_posts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "journal_posts_slug_key" ON "journal_posts"("slug");
CREATE INDEX "journal_posts_statut_publieeAt_idx" ON "journal_posts"("statut", "publieeAt" DESC);

ALTER TABLE "journal_posts" ADD CONSTRAINT "journal_posts_auteurId_fkey"
    FOREIGN KEY ("auteurId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
