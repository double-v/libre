/**
 * Champs couverts par le consentement art. 9 (#425) — partagé client/serveur.
 *
 * Séparé de `consentement-sensible.ts` parce que celui-ci importe Prisma ; la
 * page profil doit savoir quels champs déclenchent la case sans embarquer la
 * base dans le bundle.
 */
export const CONSENT_SENSIBLE_TYPE = 'sensitive_data';
/**
 * #530 : v2 = la copie qui nomme la fiche et les autres membres. La version
 * trace quel texte la personne a vu au moment du don ; les consentements v1
 * restent valables (décision d'opérateur du 2026-10-15) et aucune logique ne
 * relit la version — pas d'avenant rétroactif.
 */
export const CONSENT_SENSIBLE_VERSION = '2';

export const CHAMPS_SENSIBLES = [
  'genderIdentity',
  'orientation',
  'practices',
  'searchGenders',
  'searchOrientations',
] as const;

export type ChampSensible = (typeof CHAMPS_SENSIBLES)[number];

/** Valeur vide pour chaque champ, celle que le retrait rétablit. */
export const VIDE_SENSIBLE = {
  genderIdentity: '',
  orientation: [] as string[],
  practices: [] as string[],
  searchGenders: [] as string[],
  searchOrientations: [] as string[],
} satisfies Record<ChampSensible, '' | string[]>;

function estVide(valeur: unknown): boolean {
  return valeur === undefined || valeur === '' || (Array.isArray(valeur) && valeur.length === 0);
}

/**
 * Le corps porte-t-il une valeur sensible non vide ? Vider un champ ne demande
 * rien : c'est le geste même du retrait, il doit rester possible sans.
 */
export function porteDonneeSensible(data: Record<string, unknown>): boolean {
  return CHAMPS_SENSIBLES.some((champ) => !estVide(data[champ]));
}
