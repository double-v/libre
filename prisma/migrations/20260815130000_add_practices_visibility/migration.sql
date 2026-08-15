-- Visibilité des pratiques (#328).
--
-- Défaut 'matches', y compris pour les lignes existantes : /profil promettait
-- depuis toujours « ne s'affichent que pour vos matches » pendant que l'API
-- renvoyait le champ à tout compte connecté. Le défaut honore la promesse lue
-- par les gens qui ont rempli ce champ, plutôt que le comportement du code.
ALTER TABLE "profiles" ADD COLUMN "practicesVisibility" TEXT NOT NULL DEFAULT 'matches';
