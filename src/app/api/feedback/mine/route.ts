import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { MY_FEEDBACK_SELECT, toMyFeedback } from '@/lib/feedback-reply';

/**
 * GET /api/feedback/mine — les retours de la personne connectée et leurs
 * réponses (#477). Lecture seule : c'est `POST …/read` qui marque lu, pour
 * qu'un préchargement ou un onglet en arrière-plan n'éteigne rien.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const rows = await getDb().feedback.findMany({
    where: { userId },
    select: MY_FEEDBACK_SELECT,
    orderBy: { createdAt: 'desc' },
    // Au-delà, ce sont des retours d'il y a longtemps : la rétention les purge.
    take: 50,
  });

  return NextResponse.json({ items: rows.map(toMyFeedback) });
}
