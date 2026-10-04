import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { unreadReplyWhere } from '@/lib/feedback-reply';

/**
 * POST /api/feedback/mine/read — « Mes retours » a été affiché : toutes les
 * réponses non lues de la personne passent lues (#477). Idempotent.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  await getDb().feedback.updateMany({
    where: unreadReplyWhere(userId),
    data: { replyReadAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
