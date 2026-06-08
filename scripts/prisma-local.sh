#!/usr/bin/env bash
# Wrapper pour les commandes Prisma CLI dans la sandbox Hermes.
# Source l'env LOCAL (getlibre_dev via socket), PAS .env (Neon prod).
#
# Usage: scripts/prisma-local.sh <commande> [args...]
# Ex:    scripts/prisma-local.sh migrate deploy
#        scripts/prisma-local.sh migrate status
#        scripts/prisma-local.sh studio

set -e

# Charge UNIQUEMENT l'env local, sans toucher à .env (Neon prod)
# Prisma 7 rejette host vide : on met localhost, mais l'auth passe
# par peer (socket Unix) car le format ne contient pas de mot de passe.
# Vérifier que pg_hba.conf a bien trust/md5 sur 127.0.0.1 pour "w",
# sinon basculer en socket direct via psql.
export DATABASE_URL="postgresql://w@localhost:5432/getlibre_dev"

# Empêche dotenv de re-charger .env (override défensif)
unset DATABASE_URL_UNPOOLED

exec npx prisma "$@"
