# Setup BDD locale pour sandbox Hermes (une seule fois)

## Problème
La sandbox Hermes n'a pas les droits sudo non-interactif. Postgres
tourne mais aucun user n'est configuré pour que je puisse m'y
connecter en autonomie.

## ⚠️ RÈGLE ABSOLUE — `prisma-local.sh` est OBLIGATOIRE

Prisma 7 lit `.env` à la racine du projet **par défaut**, pas
`.env.local`. Le `.env` du projet pointe vers Neon prod.
**Si tu lances `npx prisma migrate deploy` sans wrapper, tu touches
la prod.** (Ça m'est arrivé : la migration `20260608090000_add_trust_circle`
a été appliquée à Neon par accident avant qu'on setup le wrapper.)

**TOUJOURS utiliser `./scripts/prisma-local.sh` à la place de `npx prisma` :**

```bash
./scripts/prisma-local.sh migrate status
./scripts/prisma-local.sh migrate deploy
./scripts/prisma-local.sh studio
```

Le wrapper force `DATABASE_URL=postgresql://w@localhost:5432/getlibre_dev`
avant d'invoquer Prisma. **Aucun risque de toucher Neon par accident.**

## Setup unique (depuis ton shell SSH)

### Étape 1 : Créer le role `w` + la DB

```bash
sudo -u postgres psql <<'SQL'
CREATE ROLE w WITH LOGIN CREATEDB SUPERUSER;
SQL

createdb -U w getlibre_dev
```

### Étape 2 : Ajouter la ligne trust dans pg_hba.conf

Script idempotent (réexécutable sans danger) :

```bash
sudo bash /home/w/projects/getlibre/scripts/setup-pg-hba.sh
```

Le script :
- Backup `pg_hba.conf` (timestampé)
- Ajoute `host all w 127.0.0.1/32 trust` (dev only)
- Reload Postgres
- Vérifie la connexion

### Étape 3 : Vérifier

```bash
psql -U w -d getlibre_dev -h localhost -c "SELECT current_user;"
# attendu: w
./scripts/prisma-local.sh migrate status
# attendu: "Database schema is up to date!" après 1er deploy
```

## Pourquoi ces choix

- **Role `w` (Unix user)** : peer auth possible via socket, pas de
  password à gérer. `SUPERUSER` nécessaire pour le shadow DB Prisma
  et les extensions Postgres. `CREATEDB` pour les DB de test ad-hoc.
- **Trust sur localhost (127.0.0.1/32)** : pratique dev, 0 secret.
  Le port 5432 n'est pas exposé, donc 0 risque. Si tu exposes 5432
  un jour, replace par `md5` + password.
- **DB `getlibre_dev`** : nom explicite, ne pollue pas `postgres`.

## Commandes utiles (toutes via le wrapper)

```bash
# Appliquer les migrations
./scripts/prisma-local.sh migrate deploy

# Ouvrir Prisma Studio
./scripts/prisma-local.sh studio

# Reset complet (DANGER, efface tout)
./scripts/prisma-local.sh migrate reset

# Test direct en psql
psql -U w -d getlibre_dev
```

## Pour les tests Vitest / Playwright

Le `.env` (Neon) est utilisé par défaut par Next.js pour le dev.
**Pour les tests**, on peut soit :
- Override `DATABASE_URL` dans le script de test (recommandé)
- Créer une DB dédiée `getlibre_test` et configurer Vitest pour
  l'utiliser

À voir quand on aura besoin des tests (chantier Phase 4).
