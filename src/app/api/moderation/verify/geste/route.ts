import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit, limits } from '@/lib/rate-limit';
import { tirerGeste } from '@/lib/verification/gestes';
import { lireJetonGeste, signerJetonGeste } from '@/lib/verification/jeton-geste';
import { peutDemander, statutVerification } from '@/lib/verification/statut';

// ---------------------------------------------------------------------------
// POST /api/moderation/verify/geste — tire le geste du selfie (#436).
//
// Corps optionnel `{ precedent: <jeton> }` : le seul nouveau tirage permis,
// pour qui ne peut pas faire le premier geste. La limite vit dans le jeton,
// sans état : repartir de zéro reste possible, et c'est sans danger — ce qui
// compte est que le geste soit inconnu avant le tirage, pas qu'il soit unique.
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const userId = session.user.id;

  const rl = await rateLimit(`api:${userId}`, limits.api.limit, limits.api.windowMs);
  if (!rl.success) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  if (!peutDemander(await statutVerification(userId))) {
    return NextResponse.json({ error: 'Une demande est déjà en cours ou ton profil est vérifié.' }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const precedent = typeof body?.precedent === 'string' ? await lireJetonGeste(body.precedent, userId) : null;
  if (precedent?.tirage === 2) {
    return NextResponse.json({ error: 'Tu as déjà changé de geste une fois.' }, { status: 409 });
  }

  const tirage = precedent ? 2 : 1;
  const geste = tirerGeste(precedent?.geste);
  const jeton = await signerJetonGeste({ userId, geste: geste.code, tirage });
  return NextResponse.json({ geste, jeton, peutRetirer: tirage === 1 });
}
