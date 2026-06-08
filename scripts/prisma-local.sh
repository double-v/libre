#!/usr/bin/env bash
# Wrapper pour les commandes Prisma CLI dans la sandbox Hermes.
# Source l'env LOCAL (getlibre_dev via socket), PAS .env (Neon prod).
#
# Usage: scripts/prisma-local.sh <commande> [args...]
# Ex:    scripts/prisma-local.sh migrate deploy
#        scripts/prisma-local.sh migrate status
#        scripts/prisma-local.sh studio

set -e

# CRITICAL: force local DB, NEVER read .env (which points to Neon prod).
# Prisma 7 reads .env by default, NOT .env.local. If you don't
# override DATABASE_URL here, migrations WILL go to prod. This has
# happened once (cf. commit 8e671bb): the trust_circle migration
# ended up on Neon because the wrapper didn't exist yet.
#
# ALWAYS use this wrapper, never `npx prisma` raw.
export DATABASE_URL="postgresql://w@localhost:5432/getlibre_dev"

exec npx prisma "$@"
