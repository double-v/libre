/**
 * Qui peut tirer un code ou envoyer un selfie (spec 012, FR-S01, FR-S02).
 *
 * Partagé par les deux routes membres : un compte non confirmé ou banni ne
 * fait pas travailler la modération, et les plafonds s'appliquent par compte
 * **et** par adresse IP (un robot change de compte plus vite que d'adresse).
 * Aucune de ces routes n'accepte d'identifiant de membre (FR-S06) : tout
 * part de la session.
 */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getClientIp } from '@/lib/client-ip';
import { rateLimit, limits } from '@/lib/rate-limit';

const TROP = 'Trop d’essais en peu de temps. Réessaie dans un moment.';

/** Rend une réponse de refus, ou `null` si le compte peut continuer. */
export async function gardeCompte(userId: string): Promise<NextResponse | null> {
  const compte = await getDb().user.findUnique({
    where: { id: userId },
    select: { emailVerified: true, isBanned: true },
  });
  if (!compte || compte.isBanned) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  if (!compte.emailVerified) {
    return NextResponse.json({ error: 'Confirme d’abord ton adresse e-mail.' }, { status: 403 });
  }
  return null;
}

/** Plafonds par compte et par IP ; `null` si la requête passe. */
export async function gardeFrequence(
  request: Request,
  userId: string,
  quoi: 'verifCode' | 'verifEnvoi',
): Promise<NextResponse | null> {
  const parCompte = limits[quoi];
  const parIp = limits[`${quoi}Ip`];
  const [compte, ip] = await Promise.all([
    rateLimit(`${quoi}:u:${userId}`, parCompte.limit, parCompte.windowMs),
    rateLimit(`${quoi}:ip:${getClientIp(request)}`, parIp.limit, parIp.windowMs),
  ]);
  if (!compte.success || !ip.success) {
    return NextResponse.json({ error: TROP }, { status: 429 });
  }
  return null;
}
