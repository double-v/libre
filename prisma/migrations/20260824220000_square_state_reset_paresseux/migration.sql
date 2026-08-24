-- #13 — témoin du reset de La Place.
-- Le cron Vercel répondait 401 (aucun CRON_SECRET en prod) : le reset n'a
-- jamais tourné. Il devient déclenché par le trafic, et cette ligne unique
-- dit jusqu'à quelle borne il a déjà été appliqué.
CREATE TABLE "square_state" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "last_reset_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "square_state_pkey" PRIMARY KEY ("id")
);
