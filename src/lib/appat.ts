/**
 * Garde-fous d'inscription anti-robot (#515), la partie partagée entre le
 * formulaire (client) et la route (serveur).
 *
 * Deux indices agissent avant qu'un compte existe. Le champ-appât : présent
 * dans le DOM, invisible pour une personne réelle (hors de l'arbre
 * d'accessibilité, jamais focusable, sans autocomplétion) — un robot lit le
 * DOM et remplit tout ce qu'il trouve. Le temps : une personne réelle lit,
 * écrit et coche le consentement — un robot scripté soumet en un éclair.
 *
 * Aucun des deux ne retient quoi que ce soit : ni l'IP, ni le temps, ni la
 * valeur du champ. Le refus répond comme toute erreur d'inscription et se
 * corrige au second essai : le temps court depuis l'affichage, pas depuis
 * une tentative. Côté serveur, seul un compteur sans PII trace l'effet
 * (#334 : un refus uniforme doit rester mesurable).
 */

/** Millisecondes entre l'affichage du formulaire et la soumission, en
 * dessous duquel une personne réelle au clavier ne descend pas. Un refus ne
 * dure jamais : le temps court depuis l'affichage, pas depuis un essai. */
export const TEMPS_MIN = 1500;