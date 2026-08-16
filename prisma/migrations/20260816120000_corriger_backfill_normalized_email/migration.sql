-- Corrige le backfill de `normalizedEmail` (#334).
--
-- La migration 20260528120000_add_anti_multiaccount_fields a rempli la colonne
-- avec `LOWER("email")`, alors que le code interroge la table avec
-- `normalizeEmail()` (src/lib/email.ts), qui va plus loin sur gmail : points
-- retirés du local part, `+alias` tronqué, googlemail.com replié sur gmail.com.
--
-- Conséquence : un compte enregistré avant le 2026-05-28 avec une adresse gmail
-- pointée ou aliasée porte un `normalizedEmail` qu'aucune recherche ne peut
-- retrouver. Ces comptes ne peuvent ni se connecter (src/lib/auth.ts) ni
-- réinitialiser leur mot de passe (api/auth/forgot-password) — et les deux
-- surfaces répondent comme si tout allait bien.
--
-- On recalcule donc la colonne avec les mêmes règles que le code TypeScript.
--
-- Deux garde-fous, parce que la colonne est UNIQUE et que des comptes distincts
-- peuvent converger vers la même valeur (c'est exactement ce que le champ sert
-- à détecter) :
--   1. `DISTINCT ON` — quand plusieurs comptes visent la même valeur, seul le
--      plus ancien est corrigé ;
--   2. `NOT EXISTS` — on ne prend jamais une valeur déjà portée par un autre
--      compte.
-- Les comptes laissés de côté par ces garde-fous gardent leur valeur actuelle :
-- ce sont des doublons présumés, qui relèvent d'un arbitrage humain, pas d'une
-- migration.

WITH cible AS (
  SELECT
    id,
    "createdAt",
    "normalizedEmail" AS actuel,
    CASE
      WHEN split_part(lower(btrim("email")), '@', 2) IN ('gmail.com', 'googlemail.com')
        THEN replace(
               split_part(split_part(lower(btrim("email")), '@', 1), '+', 1),
               '.',
               ''
             ) || '@gmail.com'
      ELSE lower(btrim("email"))
    END AS attendu
  FROM users
),
a_corriger AS (
  SELECT id, "createdAt", attendu FROM cible WHERE attendu <> actuel
),
elue AS (
  SELECT DISTINCT ON (attendu) id, attendu
  FROM a_corriger
  ORDER BY attendu, "createdAt" ASC, id ASC
)
UPDATE users u
SET "normalizedEmail" = e.attendu
FROM elue e
WHERE u.id = e.id
  AND NOT EXISTS (
    SELECT 1 FROM users autre
    WHERE autre."normalizedEmail" = e.attendu
      AND autre.id <> e.id
  );
