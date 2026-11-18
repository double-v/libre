import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { supprimerDoublon, type RefusDoublon } from '@/lib/moderation/gestes';

const MESSAGES: Record<RefusDoublon, string> = {
  introuvable: 'L’un des deux comptes n’existe plus. Recharge la page.',
  confirme: 'Ce compte a confirmé son adresse entre-temps : ce n’est plus un doublon probable.',
  actif: 'Ce compte a une photo, un like ou un match : décide depuis sa fiche.',
  pas_lies: 'Ces deux comptes ne partagent plus le même appareil.',
};

/** Supprimer le compte jamais confirmé d'un doublon probable (spec 011, US2). */
export async function POST(request: NextRequest) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  const body = (await request.json().catch(() => ({}))) as { orphelinId?: unknown; gardeId?: unknown };
  const { orphelinId, gardeId } = body;
  if (typeof orphelinId !== 'string' || typeof gardeId !== 'string' || orphelinId === gardeId) {
    return NextResponse.json({ error: 'Deux comptes distincts attendus' }, { status: 400 });
  }
  if (orphelinId === adminResult.userId) {
    return NextResponse.json({ error: 'On ne supprime pas son propre compte ici' }, { status: 400 });
  }

  try {
    const refus = await supprimerDoublon(adminResult.userId, orphelinId, gardeId);
    if (refus) return NextResponse.json({ error: MESSAGES[refus], refus }, { status: 409 });
    return NextResponse.json({ supprime: orphelinId });
  } catch (error) {
    console.error('indices.doublon.failed', error instanceof Error ? error.message.slice(0, 80) : 'unknown');
    return NextResponse.json({ error: 'Une erreur est survenue, réessaie' }, { status: 500 });
  }
}
