-- Règle du pseudo (#459).

-- 1. Un compte dont le pseudo a été retiré doit en choisir un nouveau avant de
--    continuer (écran /pseudo, atteint depuis la garde de Découvrir).
ALTER TABLE "users" ADD COLUMN "mustRenameDisplayName" BOOLEAN NOT NULL DEFAULT false;

-- 2. Décision opérateur (2026-09-25) : la règle de `src/lib/pseudo.ts`
--    s'applique une fois, ici, aux comptes existants. Un pseudo hors règle
--    (adresse e-mail, @, lien ou domaine, numéro, caractère hors liste,
--    longueur) n'est plus affiché : il devient « Membre » jusqu'au renommage.
--    On ne garde pas l'ancienne valeur — c'était souvent une adresse e-mail.
--    Approximation SQL volontairement un peu plus large que la règle TS (les
--    séparateurs sont retirés partout avant de compter les chiffres) : au pire,
--    un membre de plus choisit un nouveau pseudo. Idempotent.
UPDATE "users"
SET "displayName" = 'Membre', "mustRenameDisplayName" = true
WHERE "mustRenameDisplayName" = false
  AND (
       "displayName" LIKE '%@%'
    OR "displayName" ~* '(https?://|www\.)'
    OR "displayName" ~* '[[:alnum:]_-]\.(com|fr|net|org|io|me|be|ch|app|co|info|biz|xyz|eu|uk|de|es|it|link|ly|gg|tv|to|so|sh|live)([^[:alnum:]]|$)'
    OR regexp_replace("displayName", '[[:space:]._-]', '', 'g') ~ '[0-9]{6,}'
    OR "displayName" !~ '^[[:alpha:][:digit:] ''’._-]+$'
    OR "displayName" !~ '[[:alnum:]]'
    OR char_length(btrim("displayName")) < 2
    OR char_length("displayName") > 30
  );
