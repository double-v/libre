import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { unreadReplyWhere } from '@/lib/feedback-reply';

/**
 * GET /api/feedback/mine/unread — y a-t-il une réponse non lue ? (#477)
 *
 * Un booléen, jamais un nombre : la charte interdit tout compteur côté
 * membre (spec 003). `findFirst` plutôt que `count` le garantit dès la base.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ hasUnreadReply: false });

  const one = await getDb().feedback.findFirst({
    where: unreadReplyWhere(userId),
    select: { id: true },
  });

  return NextResponse.json({ hasUnreadReply: one !== null });
}
