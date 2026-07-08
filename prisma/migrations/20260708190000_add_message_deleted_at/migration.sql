-- #201 : suppression de ses propres messages (soft-delete).
-- `deletedAt` marque un message supprimé par son auteur. Le contenu (ciphertext)
-- reste en base pour la modération/RGPD mais n'est plus renvoyé aux clients
-- (masqué côté serveur) et remplacé par un tombstone « Message supprimé » côté
-- UI. Colonne nullable et additive → migration sûre, aucune donnée existante
-- impactée. Nom de colonne en camelCase quoté, cohérent avec le reste de la
-- table "messages" (createdAt, readAt) qui n'utilise pas @map.
ALTER TABLE "messages" ADD COLUMN "deletedAt" TIMESTAMP(3);
