-- Escrow de la clé privée d'identité (#198, spec 002 US1).
--
-- Jusqu'ici la clé privée ne vivait que dans le `localStorage` du navigateur qui
-- l'avait créée : changer d'appareil ou vider le cache rendait tout l'historique
-- de conversation définitivement illisible, sans le moindre message d'erreur.
-- On la conserve désormais côté serveur, scellée par une clé maître
-- (`CHAT_ESCROW_KEY`, AES-256-GCM, cf. src/lib/crypto-escrow.ts).
--
-- Deux colonnes, toutes deux nullables :
--
--   * `encryptedPrivateKey` — l'enveloppe, jamais la clé en clair. Le format est
--     versionné (`v1:iv:chiffré:tag`) pour qu'une rotation future de la clé
--     maître puisse distinguer l'ancien du neuf sans tout ré-envelopper d'un bloc.
--   * `escrowedAt` — date du versement, pour suivre la migration douce (#336) et
--     diagnostiquer les comptes restés au bord du chemin.
--
-- Aucun backfill n'est possible ici, et ce n'est pas un oubli : le serveur n'a
-- JAMAIS vu la clé privée des comptes existants. Seul l'appareil qui la détient
-- encore peut la verser au coffre — c'est le travail de #336, côté client.
--
-- Colonnes en camelCase entre guillemets, comme les colonnes existantes de cette
-- table (`publicKey`, `keyCreatedAt`) : `user_keys` n'utilise pas de `@map`.

ALTER TABLE "user_keys" ADD COLUMN "encryptedPrivateKey" TEXT;
ALTER TABLE "user_keys" ADD COLUMN "escrowedAt" TIMESTAMP(3);
