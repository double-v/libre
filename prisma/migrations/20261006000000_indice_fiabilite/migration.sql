-- Indice de fiabilité (spec 010, #501–#505). Migration additive : deux
-- tables, un champ facultatif, un index, et une contrainte relâchée.

-- Empreintes HMAC de l'appareil et de l'e-mail d'un compte banni : sans clé
-- étrangère (elles survivent à l'effacement), purgées après un an.
CREATE TABLE "banned_identity_fingerprints" (
    "id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "bannedUserId" UUID NOT NULL,
    "bannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banned_identity_fingerprints_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "banned_identity_fingerprints_kind_hash_idx" ON "banned_identity_fingerprints"("kind", "hash");
CREATE INDEX "banned_identity_fingerprints_bannedAt_idx" ON "banned_identity_fingerprints"("bannedAt");

-- Empreinte HMAC de l'adresse IP d'inscription, gardée 7 jours pour compter
-- les inscriptions groupées. Sans clé étrangère.
CREATE TABLE "signup_traces" (
    "id" UUID NOT NULL,
    "ipHash" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signup_traces_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "signup_traces_ipHash_createdAt_idx" ON "signup_traces"("ipHash", "createdAt");
CREATE INDEX "signup_traces_createdAt_idx" ON "signup_traces"("createdAt");

-- Invitation automatique à la vérification (privée, jamais lue par autrui).
ALTER TABLE "users" ADD COLUMN "verifInviteeAt" TIMESTAMP(3);

-- Fenêtre glissante des likes envoyés (rafale).
CREATE INDEX "likes_likerId_createdAt_idx" ON "likes"("likerId", "createdAt");

-- Une action automatique n'a pas d'auteur humain : adminId devient facultatif.
ALTER TABLE "moderation_logs" ALTER COLUMN "adminId" DROP NOT NULL;
