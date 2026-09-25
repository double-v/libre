/**
 * Règle du pseudo (#459).
 *
 * Le pseudo est lu par tout le monde, partout : cartes, fiches, messages, La
 * Place. Jusqu'ici seule sa longueur était vérifiée, et des membres y avaient
 * mis leur adresse e-mail ou un `@` de réseau — une donnée personnelle
 * exposée à tous, et le premier geste des faux profils pour sortir de l'app
 * (spec 006). Toutes les écritures passent par `validatePseudo` : inscription
 * et renommage. La migration `pseudo_regle` a appliqué la même règle, une
 * fois, aux comptes existants.
 *
 * L'injection n'est pas le risque principal (React échappe, Prisma paramètre,
 * le pseudo n'entre ni dans les e-mails ni dans les notifications push) ; la
 * liste blanche ferme quand même la porte aux balises et aux caractères qui
 * trompent l'œil (espaces de largeur nulle, inversion du sens d'écriture).
 */

export const PSEUDO_MIN = 2;
export const PSEUDO_MAX = 30;

export type PseudoMotif = 'longueur' | 'contact' | 'caracteres';

export type PseudoVerdict =
  | { ok: true; value: string }
  | { ok: false; motif: PseudoMotif; message: string };

/** Messages validés au prototype du 2026-09-25 : la règle, sans accuser. */
export const PSEUDO_MESSAGES: Record<PseudoMotif, string> = {
  longueur: `Entre ${PSEUDO_MIN} et ${PSEUDO_MAX} caractères.`,
  contact: 'Pas d’adresse e-mail, de lien ni de numéro dans un pseudo : il est visible par tout le monde.',
  // Espaces insécables entre les signes : sinon « . _ » part seul à la ligne.
  caracteres: 'Seulement des lettres, des chiffres, des espaces et les signes\u00a0\'\u00a0-\u00a0.\u00a0_',
};

export const PSEUDO_HINT =
  'Entre 2 et 30 caractères : lettres, chiffres, espaces, apostrophe, tiret, point ou tiret bas.';

/** Nom affiché à la place d'un pseudo retiré par la migration. */
export const PSEUDO_PROVISOIRE = 'Membre';

/** Unicode composé (NFC), espaces fusionnés, bords rognés. */
export function normalizePseudo(raw: string): string {
  return raw.normalize('NFC').replace(/\s+/g, ' ').trim();
}

// Toutes les écritures (lettres + diacritiques), chiffres, et une poignée de
// séparateurs. Le reste — symboles, emoji, ponctuation, caractères de format
// (U+200B, U+202E…) — est refusé.
const PERMIS = /^[\p{L}\p{M}\p{N} '’._-]+$/u;
const A_UN_SIGNE = /[\p{L}\p{N}]/u;

// Domaines usuels : « marie.l » passe, « camille.fr » non.
const TLD = '(?:com|fr|net|org|io|me|be|ch|app|co|info|biz|xyz|eu|uk|de|es|it|link|ly|gg|tv|to|so|sh|live)';
const DOMAINE = new RegExp(`[\\p{L}\\p{N}_-]\\.${TLD}(?![\\p{L}\\p{N}])`, 'iu');
const LIEN = /(?:https?:\/\/|www\.)/i;

/** Un moyen de contact : e-mail, `@réseau`, lien, domaine, numéro. */
function contientUnContact(p: string): boolean {
  if (p.includes('@')) return true;
  if (LIEN.test(p) || DOMAINE.test(p)) return true;
  // « 06 12 34 56 78 » : on recolle les chiffres séparés avant de compter.
  const recolle = p.replace(/(?<=\d)[\s._-]+(?=\d)/g, '');
  return /\d{6,}/.test(recolle);
}

export function validatePseudo(raw: string): PseudoVerdict {
  const value = normalizePseudo(raw);
  const longueur = [...value].length;
  const refus = (motif: PseudoMotif): PseudoVerdict => ({ ok: false, motif, message: PSEUDO_MESSAGES[motif] });
  if (longueur < PSEUDO_MIN || longueur > PSEUDO_MAX) return refus('longueur');
  if (contientUnContact(value)) return refus('contact');
  if (!PERMIS.test(value) || !A_UN_SIGNE.test(value)) return refus('caracteres');
  return { ok: true, value };
}
