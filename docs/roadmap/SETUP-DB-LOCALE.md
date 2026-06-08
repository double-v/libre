# Setup BDD locale pour sandbox Hermes (une seule fois)

## Problème
La sandbox Hermes n'a pas les droits sudo. Postgres tourne mais aucun
user n'est configuré pour que je puisse m'y connecter en autonomie.

## Action requise (depuis ton shell SSH, pas depuis Telegram)

Colle ce bloc en une fois :

```bash
# 1. Créer le role "w" qui matche ton user Unix (peer auth via socket)
sudo -u postgres psql <<'SQL'
CREATE ROLE w WITH LOGIN CREATEDB SUPERUSER;
SQL

# 2. Vérifier que ça marche
psql -U w -d postgres -c "SELECT current_user, current_database();"

# 3. Créer la DB dédiée au projet getlibre
createdb -U w getlibre_dev

# 4. Vérifier
psql -U w -d getlibre_dev -c "SELECT current_database();"
```

## Pourquoi ces choix

- **`SUPERUSER`** : nécessaire pour que `prisma migrate` puisse
  créer le shadow DB et gérer les extensions.
- **`CREATEDB`** : pour que je puisse créer des DB de test ad-hoc
  sans te redéranger.
- **`LOGIN`** : explicite (depuis PG 10 c'est plus le défaut).
- **`getlibre_dev`** : nom explicite, évite de polluer `postgres`.
- **Pas de mot de passe** : on reste en peer auth via le socket
  Unix. Aucun secret à stocker dans `.env`, aucun risque de leak.

## Après : ce que je fais de mon côté

Une fois que tu m'as confirmé que `psql -U w -d getlibre_dev` répond,
je (moi, Hermes) :

1. Vérifie depuis ma sandbox
2. Ajoute `DATABASE_URL` au `.env` du projet (mais en local
   seulement, **pas committé**)
3. Lance `npx prisma migrate deploy` pour appliquer la migration
   `20260608090000_add_trust_circle` (cf. #44)
4. Lance `npx prisma generate` (déjà fait, mais pour la cohérence)
5. Lance `npm run build` pour confirmer
6. Commit un éventuel fix si Prisma détecte un écart

## Si tu veux limiter les droits

Remplace `SUPERUSER` par rien. Dans ce cas, les commandes Prisma qui
nécessitent du superuser (créer extension, shadow DB) planteront.
Pour `prisma migrate deploy` basique sans shadow, ça peut suffire.
Mais on perd la validation `prisma migrate diff`.

Mon avis : `SUPERUSER` est OK pour une DB **locale de dev**. Aucun
risque sécurité (le port 5432 n'est pas exposé, c'est ta machine).
