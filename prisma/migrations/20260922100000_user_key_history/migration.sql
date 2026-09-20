-- Réinitialisation de la clé de messagerie (#340) : on garde les clés publiques
-- remplacées pour que le pair puisse relire ce qu'il avait chiffré pour elles.
CREATE TABLE "user_key_history" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "publicKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "replacedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_key_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_key_history_userId_idx" ON "user_key_history"("userId");

ALTER TABLE "user_key_history" ADD CONSTRAINT "user_key_history_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
