/**
 * POST /api/circle/check-in/:id/cancel — Annule un check-in.
 *
 * Cf. docs/roadmap/chantiers/01-securite/plan.md tâche 2.4.
 *
 * Comportement :
 * - Auth requise
 * - Vérifie que le checkin appartient au user (404 sinon)
 * - Vérifie que status = 'active' (409 si déjà validated/cancelled/expired)
 * - Update status = 'cancelled' (resolvedAt laissé à null, on garde le
 *   fait qu'il a été annulé avant terme — pas un "resolved" complet)
 * - Pas de notification
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { cancelCheckinSchema } from '@/lib/trust/checkin-validators';

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Identifiant invalide' }, { status: 404 });
    }

    const parsed = cancelCheckinSchema.safeParse({});
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const db = getDb();
    const userId = session.user.id;

    const checkin = await db.safetyCheckin.findFirst({
      where: { id, userId },
      select: { id: true, status: true },
    });
    if (!checkin) {
      return NextResponse.json({ error: 'Check-in non trouvé' }, { status: 404 });
    }

    if (checkin.status !== 'active') {
      return NextResponse.json(
        {
          error: `Ce check-in est déjà ${checkin.status} et ne peut pas être annulé.`,
        },
        { status: 409 },
      );
    }

    const updated = await db.safetyCheckin.update({
      where: { id: checkin.id },
      data: { status: 'cancelled' },
      select: { id: true, status: true },
    });

    return NextResponse.json(
      { id: updated.id, status: updated.status },
      { status: 200 },
    );
  } catch (error) {
    console.error('POST /api/circle/check-in/:id/cancel error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}
