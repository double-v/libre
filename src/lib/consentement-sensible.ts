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

import {
  CONSENT_SENSIBLE_TYPE,
  CONSENT_SENSIBLE_VERSION,
  VIDE_SENSIBLE,
} from '@/lib/consentement-sensible-champs';

export * from '@/lib/consentement-sensible-champs';

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
