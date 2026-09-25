/**
 * Un moyen de contact dans un texte lu par autrui (#459, spec 009).
 *
 * E-mail, `@réseau`, lien, domaine, numéro de téléphone : ce qu'un pseudo ou
 * une réponse publique ne doit pas porter — donnée personnelle exposée à tous,
 * et premier geste des faux profils pour sortir de l'app (spec 006). Partagé
 * par le pseudo, les réponses aux questions, et la détection de #443.
 *
 * Deux modes. Un **pseudo** n'a pas de phrase : toute extension de domaine y
 * est suspecte. Dans un **texte**, plusieurs extensions sont aussi des mots
 * (`de`, `me`, `es`, `so`, `to`…) qu'un point sans espace colle au mot
 * précédent (« la mer.De temps en temps ») : on n'y garde que les extensions
 * sans ambiguïté, pour ne pas refuser une phrase honnête.
 */

export type ModeContact = 'pseudo' | 'texte';

const TLD_TOUS = 'com|fr|net|org|io|me|be|ch|app|co|info|biz|xyz|eu|uk|de|es|it|link|ly|gg|tv|to|so|sh|live';
const TLD_SANS_MOTS = 'com|fr|net|org|io|be|ch|app|info|biz|xyz|eu|uk|link|ly|gg|tv|live';

const domaine = (tlds: string) => new RegExp(`[\\p{L}\\p{N}_-]\\.(?:${tlds})(?![\\p{L}\\p{N}])`, 'iu');
const DOMAINE: Record<ModeContact, RegExp> = { pseudo: domaine(TLD_TOUS), texte: domaine(TLD_SANS_MOTS) };
const LIEN = /(?:https?:\/\/|www\.)/i;

export function contientUnContact(texte: string, mode: ModeContact): boolean {
  if (texte.includes('@')) return true;
  if (LIEN.test(texte) || DOMAINE[mode].test(texte)) return true;
  // « 06 12 34 56 78 » : on recolle les chiffres séparés avant de compter.
  const recolle = texte.replace(/(?<=\d)[\s._-]+(?=\d)/g, '');
  return /\d{6,}/.test(recolle);
}
