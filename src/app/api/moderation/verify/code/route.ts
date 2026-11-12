import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { peutTirer, tirerCode } from '@/lib/verification/code';
import { gardeCompte, gardeFrequence } from '@/lib/verification/eligibilite';
import { peutDemander, statutVerification } from '@/lib/verification/statut';

// ---------------------------------------------------------------------------
// POST /api/moderation/verify/code — tire le code du selfie (spec 012, US1).
//
// Remplace le geste de #436. Aucun corps lu : le code vient du serveur, pour
// le membre de la session (FR-S06). Un nouveau tirage révoque le précédent.
// Après trois refus consécutifs, 429 avec la date de reprise (FR-012).
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const userId = session.user.id;

  const refusFrequence = await gardeFrequence(request, userId, 'verifCode');
  if (refusFrequence) return refusFrequence;
  const refusCompte = await gardeCompte(userId);
  if (refusCompte) return refusCompte;

  const statut = await statutVerification(userId);
  if (!peutDemander(statut)) {
    return NextResponse.json(
      { error: 'Une demande est déjà en cours ou ton profil est vérifié.', statut: statut.statut },
      { status: 409 },
    );
  }
  const droit = await peutTirer(userId);
  if (!droit.ok) {
    return NextResponse.json(
      { error: 'Tu pourras refaire ton selfie après cette date.', reessaiAt: droit.reessaiAt.toISOString() },
      { status: 429 },
    );
  }

  const { code, expireAt } = await tirerCode(userId);
  return NextResponse.json({ code, expireAt: expireAt.toISOString() });
}
