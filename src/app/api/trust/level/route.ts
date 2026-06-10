/**
 * GET /api/trust/level
 *
 * Retourne le niveau de confiance de l'utilisateur connecté.
 * Cf. chantier 01 — Phase 3, tâche 3.2.
 *
 * Réponse :
 * {
 *   band: 'newcomer' | 'member' | 'trusted' | 'anchor',
 *   score: number,
 *   factors: Array<{ label: string, delta: number, achieved: boolean }>
 * }
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getOrComputeTrustLevel,
  factorsToDisplay,
} from '@/lib/trust/compute-level';
import { debugLog } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Non authentifié' },
      { status: 401 },
    );
  }

  try {
    const { score, band, factors } = await getOrComputeTrustLevel(session.user.id);

    return NextResponse.json({
      band,
      score,
      factors: factorsToDisplay(factors),
    });
  } catch (err) {
    debugLog('trust.level.compute_failed', {
      userId: session.user.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: 'Erreur lors du calcul du niveau de confiance' },
      { status: 500 },
    );
  }
}
