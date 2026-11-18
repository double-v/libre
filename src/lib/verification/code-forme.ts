/**
 * Forme du code manuscrit (spec 012) : règles pures, sans base ni Node,
 * partagées par le serveur et par la carte de modération.
 *
 * Ni 0 ni 1 : ils se confondent avec O et I une fois écrits à la main.
 */
export const CHIFFRES_CODE = '23456789';
export const LONGUEUR_CODE = 4;

const FORME_CODE = new RegExp(`^[${CHIFFRES_CODE}]{${LONGUEUR_CODE}}$`);

/** Vrai si la valeur a la forme d'un code : rien d'autre n'est jamais comparé en base. */
export function estFormeCode(valeur: unknown): valeur is string {
  return typeof valeur === 'string' && FORME_CODE.test(valeur);
}

/**
 * Extrait le code d'un texte lu : le premier mot de exactement quatre
 * chiffres autorisés. `''` si aucun. On n'assemble pas des chiffres épars :
 * « LIBRE » lu en chiffres puis collé au code donnerait un faux code, pire
 * qu'une lecture impossible.
 */
export function normaliserCodeLu(texte: string): string {
  for (const mot of texte.split(/[^0-9]+/)) {
    if (FORME_CODE.test(mot)) return mot;
  }
  return '';
}

export interface Caractere {
  c: string;
  /** Faux si le caractère lu diffère de l'attendu à cette place. */
  ok: boolean;
}

/** Caractères lus, chacun marqué juste ou divergent par rapport au code attendu. */
export function comparerCode(attendu: string, lu: string): Caractere[] {
  return [...lu].map((c, i) => ({ c, ok: attendu[i] === c }));
}
