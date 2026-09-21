-- Témoin de la purge de rétention (#427) : singleton, verrou par UPDATE … WHERE
-- last_run_at < borne (même motif que square_state pour le reset de la Place).
CREATE TABLE "retention_state" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "last_run_at" TIMESTAMP(3) NOT NULL,
    "last_report" JSONB,

    CONSTRAINT "retention_state_pkey" PRIMARY KEY ("id")
);
