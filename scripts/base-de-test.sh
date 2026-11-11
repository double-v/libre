#!/usr/bin/env bash
# Base de test jetable en local (#548) : un PostgreSQL dans Docker, neuf à
# chaque lancement, migré, puis toute la suite Vitest, intégration comprise
# (le jeu factice est semé par le globalSetup de Vitest, pas par `npx tsx`).
# Jamais Neon : l'adresse est fixée ici, pas lue dans `.env`.
# Le conteneur est détruit à la fin ; GARDER_BASE=1 le conserve pour enquêter.
set -euo pipefail

CONTENEUR=libre-base-de-test
PORT=54329
export DATABASE_URL="postgresql://libre:libre@localhost:${PORT}/libre_test"
export DATABASE_URL_UNPOOLED="$DATABASE_URL"
export BASE_DE_TEST=1
export NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-secret-de-test-local}"

nettoyer() { [ "${GARDER_BASE:-0}" = 1 ] || docker rm -f "$CONTENEUR" >/dev/null 2>&1 || true; }
trap nettoyer EXIT

docker rm -f "$CONTENEUR" >/dev/null 2>&1 || true
docker run -d --name "$CONTENEUR" -e POSTGRES_USER=libre -e POSTGRES_PASSWORD=libre \
  -e POSTGRES_DB=libre_test -p "127.0.0.1:${PORT}:5432" postgres:17 >/dev/null

# `-h 127.0.0.1` : pendant son initialisation, l'image démarre un serveur
# temporaire qui n'écoute que sur le socket Unix. Sans `-h`, pg_isready le
# verrait prêt trop tôt, et la migration tomberait sur un refus de connexion.
pret=0
for _ in $(seq 1 60); do
  if docker exec "$CONTENEUR" pg_isready -h 127.0.0.1 -U libre -d libre_test >/dev/null 2>&1; then pret=1; break; fi
  sleep 1
done
if [ "$pret" != 1 ]; then
  echo "[test:db] PostgreSQL n'a pas démarré en 60 s." >&2
  docker logs --tail 20 "$CONTENEUR" >&2 || true
  exit 1
fi

npx prisma migrate deploy
npx vitest run "$@"
