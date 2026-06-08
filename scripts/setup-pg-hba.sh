#!/usr/bin/env bash
# Setup pg_hba.conf : ajout de la ligne trust pour user w sur localhost
# Usage: sudo bash setup-pg-hba.sh
set -e

HBA_FILE="/etc/postgresql/18/main/pg_hba.conf"
MARKER="# Hermes sandbox - local trust for user w (dev only)"

# Garde-fou : on n'écrase pas, on ajoute
if grep -qF "$MARKER" "$HBA_FILE"; then
  echo "[OK] Ligne deja presente, rien a faire"
  grep -F "$MARKER" "$HBA_FILE"
  exit 0
fi

# Backup avant modif
cp "$HBA_FILE" "${HBA_FILE}.bak.$(date +%s)"

# On insere les 2 lignes AVANT la premiere ligne "host all all ..."
# Format de la ligne trust : host all w 127.0.0.1/32 trust
TMP=$(mktemp)
{
  awk '
    /^host[[:space:]]+all[[:space:]]+all[[:space:]]+127\.0\.0\.1\/32/ && !done {
      print "# Hermes sandbox - local trust for user w (dev only)"
      print "host    all             w              127.0.0.1/32            trust"
      done=1
    }
    { print }
  ' "$HBA_FILE"
} > "$TMP"
cp "$TMP" "$HBA_FILE"
rm "$TMP"

echo "[OK] Ligne ajoutee :"
grep -A1 "Hermes sandbox" "$HBA_FILE"

# Reload
pg_ctlcluster 18 main reload
echo "[OK] Postgres recharge"

# Verif
echo "--- Test connexion ---"
psql -U w -d getlibre_dev -h localhost -c "SELECT current_user, current_database();" 2>&1
