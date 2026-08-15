-- Seuil de consentement du lecteur pour les photos sensibles (#331).
--
-- Défaut 'none' : personne ne se retrouve exposé à un contenu classé sans
-- l'avoir demandé, y compris les comptes existants. Le réglage exprime un
-- défaut, pas une interdiction — le bouton « Voir » reste disponible photo par
-- photo.
ALTER TABLE "profiles" ADD COLUMN "photoSensitivityOptIn" TEXT NOT NULL DEFAULT 'none';
