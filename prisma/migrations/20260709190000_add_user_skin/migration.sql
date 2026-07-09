-- Skin choisi par l'utilisateur (cf. #224). Colonne additive et nullable :
-- null = aucun choix explicite (on retombe sur le défaut du site / localStorage).
ALTER TABLE "users" ADD COLUMN "skin" TEXT;
