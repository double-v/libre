/**
 * Lecture automatique du code manuscrit (spec 012, FR-004, FR-005, R3).
 * Serveur uniquement (tesseract.js, sharp).
 *
 * Un indice pour la modération, jamais une décision : l'écriture à la main
 * se lit mal, et un code bien lu ne prouve pas que la personne est la bonne.
 * Le résultat n'est jamais renvoyé au membre (FR-S05) : il saurait sinon
 * quoi corriger sur une image fabriquée.
 */
import { lireTexte } from '@/lib/fraude/lecture-photo';
import { CHIFFRES_CODE, normaliserCodeLu } from './code-forme';

/** Lit le code sur l'image. `''` si rien de lisible ou en cas d'échec. */
export async function lireCode(image: Buffer): Promise<string> {
  return normaliserCodeLu(await lireTexte(image, { listeBlanche: CHIFFRES_CODE }));
}
