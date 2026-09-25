import { NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retirer une réponse aux questions de profil (spec 009, US3). La réponse
 * n'est pas supprimée : elle passe `removed`, ne sort plus vers personne et
 * ne lève plus aucun voile ; son autrice voit une mention sobre et peut en
 * écrire une autre. Journalisé avec la clé de question — jamais le texte, qui
 * resterait lisible dans le journal après une réécriture.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  try {
    const { id } = await params;
    // Colonne @db.Uuid : un identifiant malformé ferait lever Prisma (500).
    // C'est une réponse introuvable, pas une panne.
    if (!UUID.test(id)) return NextResponse.json({ error: 'Réponse introuvable' }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as { status?: unknown };
    if (body.status !== 'removed') {
      return NextResponse.json({ error: 'Seul le retrait est possible ici.' }, { status: 400 });
    }

    const answer = await getDb().profileAnswer.findUnique({
      where: { id },
      select: { id: true, userId: true, questionKey: true },
    });
    if (!answer) return NextResponse.json({ error: 'Réponse introuvable' }, { status: 404 });

    await getDb().profileAnswer.update({ where: { id }, data: { status: 'removed' } });
    await getDb().moderationLog.create({
      data: {
        adminId: adminResult.userId,
        targetUserId: answer.userId,
        action: 'REMOVE_ANSWER',
        reason: answer.questionKey,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('answers.remove.failed', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Une erreur est survenue, veuillez réessayer' }, { status: 500 });
  }
}
