import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { adminHandleFeedbackSchema } from '@/lib/validators';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  const { id } = await params;

  const body = await request.json();
  const parsed = adminHandleFeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation échouée' }, { status: 400 });
  }

  const existing = await getDb().feedback.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ error: 'Retour non trouvé' }, { status: 404 });
  }

  // Pas d'entrée ModerationLog ici : ce journal cible un utilisateur
  // (targetUserId est requis) et trace des sanctions. Classer un retour n'est
  // ni l'un ni l'autre, et un retour peut être anonyme.
  const feedback = await getDb().feedback.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json({ feedback: { id: feedback.id, status: feedback.status } });
}
