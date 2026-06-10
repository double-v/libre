-- CreateTable
CREATE TABLE "site_config" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "currentTheme" TEXT NOT NULL DEFAULT 'default',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "site_config_pkey" PRIMARY KEY ("id")
);

-- Seed the singleton row
INSERT INTO "site_config" ("id", "currentTheme", "updatedAt")
VALUES ('singleton', 'default', NOW());

-- AddForeignKey (updatedBy → users)
ALTER TABLE "site_config" ADD CONSTRAINT "site_config_updatedBy_fkey"
    FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
