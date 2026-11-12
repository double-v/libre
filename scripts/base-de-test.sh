#!/usr/bin/env bash
# Base de test jetable en local (#548) : un PostgreSQL dans Docker, neuf à
# chaque lancement, migré, puis toute la suite Vitest, intégration comprise
# (le jeu factice est semé par le globalSetup de Vitest, pas par `npx tsx`).
# Jamais Neon : l'adresse est construite ici, pas lue dans `.env`.
# Le conteneur est détruit à la fin ; GARDER_BASE=1 le conserve pour enquêter.
#
# Chaque lancement a son propre conteneur et son propre port. Avec un nom et
# un port fixes, deux lancements simultanés (deux worktrees, deux agents) se
# détruisaient l'un l'autre la base en plein milieu, et l'échec ressemblait à
# une vraie régression.
set -euo pipefail

CONTENEUR="libre-base-de-test-$$-${RANDOM}"
export BASE_DE_TEST=1
export NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-secret-de-test-local}"

nettoyer() {
  if [ "${GARDER_BASE:-0}" = 1 ]; then
    echo "[test:db] Base conservée : conteneur ${CONTENEUR}, ${DATABASE_URL:-adresse inconnue}" >&2
    echo "[test:db] À détruire ensuite : docker rm -f ${CONTENEUR}" >&2
  else
    docker rm -f "$CONTENEUR" >/dev/null 2>&1 || true
  fi
}
trap nettoyer EXIT

# Port choisi par Docker parmi les ports libres, sur l'interface locale seule.
docker run -d --name "$CONTENEUR" --label libre.base-de-test=1 \
  -e POSTGRES_USER=libre -e POSTGRES_PASSWORD=libre -e POSTGRES_DB=libre_test \
  -p "127.0.0.1::5432" postgres:17 >/dev/null
PORT="$(docker port "$CONTENEUR" 5432/tcp | head -n1 | sed 's/.*://')"
if ! [[ "$PORT" =~ ^[0-9]+$ ]]; then
  echo "[test:db] Port du conteneur illisible : « ${PORT} »." >&2
  exit 1
fi
export DATABASE_URL="postgresql://libre:libre@localhost:${PORT}/libre_test"
export DATABASE_URL_UNPOOLED="$DATABASE_URL"

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
