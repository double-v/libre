-- Badge vérifié par selfie (#436) : le geste tiré par le serveur et le motif
-- de refus lu par le membre. Nullables : les demandes antérieures n'en ont pas.
ALTER TABLE "verification_requests" ADD COLUMN "challenge" TEXT;
ALTER TABLE "verification_requests" ADD COLUMN "rejectReason" TEXT;
