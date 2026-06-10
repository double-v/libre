/**
 * POST /api/circle/check-in/:id/validate — Valide "Je suis safe".
 *
 * Cf. docs/roadmap/chantiers/01-securite/plan.md tâche 2.3.
 *
 * Comportement :
 * - Auth requise
 * - Vérifie que le checkin appartient au user (404 sinon)
 * - Vérifie que status = 'active' (409 si déjà validated/cancelled/expired)
 * - Update status = 'validated', resolvedAt = now
 * - Pas de notification (happy path silencieux)
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { validateCheckinSchema } from '@/lib/trust/checkin-validators';

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function POST(
  request: Request,
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

    // Le validator exige un body vide (cf. checkin-validators.ts).
    // On ne s'en sert pas vraiment (pas de body), mais on l'invoque
    // pour respecter le contrat.
    const parsed = validateCheckinSchema.safeParse({});
    if (!parsed.success) {
      // En pratique inatteignable (le schema accepte un body vide),
      // mais on garde la garde pour rester aligné avec le pattern.
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const db = getDb();
    const userId = session.user.id;

    // Trouve le checkin si owner = user courant (anti-leak 404)
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
          error: `Ce check-in est déjà ${checkin.status} et ne peut pas être validé.`,
        },
        { status: 409 },
      );
    }

    const updated = await db.safetyCheckin.update({
      where: { id: checkin.id },
      data: { status: 'validated', resolvedAt: new Date() },
      select: { id: true, status: true, resolvedAt: true },
    });

    return NextResponse.json(
      {
        id: updated.id,
        status: updated.status,
        resolvedAt: updated.resolvedAt!.toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('POST /api/circle/check-in/:id/validate error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}
