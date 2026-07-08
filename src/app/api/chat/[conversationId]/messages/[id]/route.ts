import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { pusher, getPusherChannel } from '@/lib/pusher';
import { verifyParticipant } from '@/lib/chat-access';

// ---------------------------------------------------------------------------
// DELETE /api/chat/[conversationId]/messages/[id]
//
// Suppression par l'auteur de SON propre message (#201). Soft-delete : on
// positionne `deletedAt`, on ne détruit jamais la ligne — le contenu (ciphertext)
// reste en base pour la modération/RGPD mais est masqué à l'affichage (GET) et
// remplacé par un tombstone « Message supprimé » côté client.
// ---------------------------------------------------------------------------
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string; id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId, id } = await params;
    const userId = session.user.id;

    // 1. Participant de la conversation ? (404 conversation absente, 403 sinon)
    const result = await verifyParticipant(conversationId, userId);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    // 2. Le message existe et appartient bien à cette conversation
    const message = await getDb().message.findUnique({
      where: { id },
      select: { id: true, senderId: true, conversationId: true, deletedAt: true },
    });
    if (!message || message.conversationId !== conversationId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // 3. AUTEUR uniquement : on ne supprime que ses propres messages
    if (message.senderId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Soft-delete (idempotent : déjà supprimé → ne pas réécrire)
    if (!message.deletedAt) {
      await getDb().message.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    }

    // 5. Notif temps-réel BEST-EFFORT — la suppression est déjà persistée.
    // Une panne Pusher (creds/quota/réseau) ne doit jamais faire échouer une
    // suppression réussie (même philosophie que l'envoi, cf. régression #206).
    try {
      const channel = getPusherChannel(conversationId);
      await pusher.trigger(channel, 'message-deleted', { id });
    } catch (pusherError) {
      console.error('Pusher message-deleted notification error:', pusherError);
    }

    return NextResponse.json({ id, deleted: true }, { status: 200 });
  } catch (error) {
    console.error('Message delete error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}
