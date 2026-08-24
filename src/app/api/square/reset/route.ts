import { NextRequest, NextResponse } from 'next/server';
import { resetSquare } from '@/lib/square/reset';

/**
 * Reset de La Place déclenché par le cron Vercel.
 *
 * Ce chemin n'a **jamais** tourné en prod : aucun `CRON_SECRET` n'y est défini,
 * donc la garde ci-dessous répondait 401 à chaque passage, en silence (#13).
 * Il reste en place — le jour où le secret existe, il redevient une ceinture —
 * mais le reset ne dépend plus de lui : `ensureSquareFresh()` l'exécute au
 * premier passage HTTP après l'heure dite.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const outcome = await resetSquare();

  return NextResponse.json({
    success: true,
    deletedMessages: outcome.deletedMessages,
    deletedReactions: outcome.deletedReactions,
  });
}
