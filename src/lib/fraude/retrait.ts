import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

/**
 * Un compte mis en retrait (spec 006, décision « Demander une vérification »)
 * garde l'accès à son compte mais ne peut plus aller vers les autres —
 * ni liker, ni écrire — tant que son badge selfie n'est pas approuvé.
 *
 * Le motif `verification_requise` ne dit rien d'un soupçon : le client le
 * traduit par une invitation à se faire vérifier.
 */
export async function refusSiRetrait(userId: string): Promise<NextResponse | null> {
  let u: { retraitAt: Date | null } | null = null;
  try {
    u = await getDb().user.findUnique({ where: { id: userId }, select: { retraitAt: true } });
  } catch {
    // Une lecture qui échoue ne bloque pas : la route échouera d'elle-même
    // sur la base, et un faux refus serait pire qu'un geste permis.
  }
  if (u?.retraitAt) {
    return NextResponse.json({ error: 'verification_requise' }, { status: 403 });
  }
  return null;
}
