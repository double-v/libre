#!/usr/bin/env bash
# Base de test jetable en local (#548) : un PostgreSQL dans Docker, vidé,
# migré et rempli du jeu factice, puis toute la suite Vitest, intégration
# comprise. Jamais Neon : l'adresse est fixée ici, pas lue dans `.env`.
set -euo pipefail

CONTENEUR=libre-base-de-test
PORT=54329
export DATABASE_URL="postgresql://libre:libre@localhost:${PORT}/libre_test"
export DATABASE_URL_UNPOOLED="$DATABASE_URL"
export BASE_DE_TEST=1
export NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-secret-de-test-local}"

# Repartir d'un conteneur neuf : « vidé » sans dépendre d'un reset Prisma.
docker rm -f "$CONTENEUR" >/dev/null 2>&1 || true
docker run -d --name "$CONTENEUR" -e POSTGRES_USER=libre -e POSTGRES_PASSWORD=libre \
  -e POSTGRES_DB=libre_test -p "127.0.0.1:${PORT}:5432" postgres:17 >/dev/null

for _ in $(seq 1 30); do
  docker exec "$CONTENEUR" pg_isready -U libre -d libre_test >/dev/null 2>&1 && break
  sleep 1
done

npx prisma migrate deploy
# Le jeu factice est semé par le globalSetup de Vitest (pas de `npx tsx`).
npx vitest run "$@"
