import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { unreadConversationIds } from '@/lib/chat-unread';

/**
 * GET /api/chat/unread — conversations avec au moins un message non lu (#389).
 *
 * Renvoie des identifiants, jamais un compte : la charte interdit tout nombre
 * de non-lus côté membre, on ne fabrique pas la donnée qu'on s'interdit
 * d'afficher. Une seule requête sert la pastille de l'onglet Messages (liste
 * non vide) et celles de la liste des conversations (appartenance).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const conversationIds = await unreadConversationIds(session.user.id);
    return NextResponse.json({ conversationIds }, { status: 200 });
  } catch (error) {
    console.error('Unread list error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}
