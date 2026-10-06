/**
 * Fuseau incohérent (spec 010, research R6). Le fuseau du navigateur dit où
 * est l'**appareil**, jamais l'origine de la personne : c'est un indice faible,
 * qui ne pèse qu'à côté de deux autres. Il n'est comparé qu'au moment où une
 * ville est saisie à la main, et **jamais conservé** — seul le résultat l'est,
 * sous forme de signal.
 *
 * La France compte des fuseaux hors d'Europe (outre-mer) : ils sont attendus.
 */
const FUSEAUX_ATTENDUS = new Set([
  'Atlantic/Canary', 'Atlantic/Madeira', 'Atlantic/Azores', 'Atlantic/Faroe', 'Atlantic/Reykjavik',
  'Africa/Ceuta', 'Arctic/Longyearbyen', 'Asia/Nicosia', 'Asia/Famagusta',
  // Outre-mer français.
  'America/Guadeloupe', 'America/Martinique', 'America/Cayenne', 'America/Miquelon',
  'America/St_Barthelemy', 'America/Marigot', 'Indian/Reunion', 'Indian/Mayotte',
  'Indian/Kerguelen', 'Pacific/Noumea', 'Pacific/Tahiti', 'Pacific/Marquesas',
  'Pacific/Gambier', 'Pacific/Wallis',
]);

/** Forme IANA « Zone/Ville » ; UTC, GMT et Etc/* ne disent rien d'un lieu. */
const IANA = /^[A-Z][A-Za-z_]+\/[A-Z][A-Za-z_+-]+(?:\/[A-Z][A-Za-z_+-]+)?$/;

export function fuseauIncoherent(fuseau: string | null | undefined, paysVille: string): boolean {
  if (paysVille !== 'France') return false;
  if (!fuseau || !IANA.test(fuseau) || fuseau.startsWith('Etc/')) return false;
  if (fuseau.startsWith('Europe/') || FUSEAUX_ATTENDUS.has(fuseau)) return false;
  return true;
}
