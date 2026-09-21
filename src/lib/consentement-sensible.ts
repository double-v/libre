/**
 * Consentement explicite aux données de vie sexuelle (#425, art. 9 RGPD).
 *
 * Orientation, identité de genre et pratiques sont des « catégories
 * particulières » : « exécution du contrat » ne les couvre pas. Les genres et
 * orientations cherchés en font partie aussi — mon genre plus ceux que je
 * cherche, c'est mon orientation. Le consentement est distinct de celui des
 * CGU, tracé dans `Consent`, et retirable : le retrait efface ces champs.
 */
import { getDb } from '@/lib/db';

export const CONSENT_SENSIBLE_TYPE = 'sensitive_data';
export const CONSENT_SENSIBLE_VERSION = '1';

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

export async function aConsentementSensible(userId: string): Promise<boolean> {
  const actif = await getDb().consent.findFirst({
    where: { userId, type: CONSENT_SENSIBLE_TYPE, given: true, withdrawnAt: null },
    select: { id: true },
  });
  return actif !== null;
}

/** Enregistre le consentement s'il n'est pas déjà actif ; renvoie l'état final. */
export async function donnerConsentementSensible(
  userId: string,
  trace: { ipAddress?: string; userAgent?: string } = {},
): Promise<true> {
  if (await aConsentementSensible(userId)) return true;
  await getDb().consent.create({
    data: { userId, type: CONSENT_SENSIBLE_TYPE, version: CONSENT_SENSIBLE_VERSION, given: true, ...trace },
  });
  return true;
}

/** Retire le consentement et efface ce qu'il couvrait, d'un seul tenant. */
export async function retirerConsentementSensible(userId: string): Promise<void> {
  const now = new Date();
  await getDb().$transaction([
    getDb().consent.updateMany({
      where: { userId, type: CONSENT_SENSIBLE_TYPE, given: true, withdrawnAt: null },
      data: { withdrawnAt: now },
    }),
    getDb().profile.updateMany({ where: { userId }, data: VIDE_SENSIBLE }),
  ]);
}

/** Trace de preuve (art. 7.1), même forme qu'à l'inscription. */
export function traceConsentement(request: Request): { ipAddress?: string; userAgent?: string } {
  const forwarded = request.headers.get('x-forwarded-for');
  const ipAddress = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || undefined;
  const userAgent = request.headers.get('user-agent') || undefined;
  return { ipAddress, userAgent };
}
