import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { messageSchema } from '@/lib/validators';
import { pusher, getPusherChannel } from '@/lib/pusher';
import { rateLimit, limits } from '@/lib/rate-limit';
import { verifyParticipant } from '@/lib/chat-access';

// ---------------------------------------------------------------------------
// GET /api/chat/[conversationId]/messages
// ---------------------------------------------------------------------------
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await params;
    const userId = session.user.id;

    const result = await verifyParticipant(conversationId, userId);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    // Fetch messages (limit 100, most recent first)
    const messages = await getDb().message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Mark unread messages addressed to this user as read
    await getDb().message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    // Return in chronological order (oldest first). Deleted messages keep their
    // slot in the thread (tombstone côté client via `deletedAt`) mais leur
    // contenu (ciphertext) est masqué : on ne le renvoie jamais aux clients une
    // fois le message supprimé par son auteur (cf. #201, soft-delete).
    const sorted = [...messages]
      .reverse()
      .map((m) => (m.deletedAt ? { ...m, content: '' } : m));

    return NextResponse.json({ messages: sorted }, { status: 200 });
  } catch (error) {
    console.error('Messages list error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/chat/[conversationId]/messages
// ---------------------------------------------------------------------------
export async function POST(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = await rateLimit(`message:${session.user.id}`, limits.message.limit, limits.message.windowMs);
    if (!rl.success) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    const { conversationId } = await params;
    const userId = session.user.id;

    const result = await verifyParticipant(conversationId, userId);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const parsed = messageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Content is CIPHERTEXT — encrypted client-side before sending.
    // The server never sees plaintext.
    const message = await getDb().message.create({
      data: {
        conversationId,
        senderId: userId,
        content: parsed.data.content,
      },
    });

    // Pusher real-time notification — only metadata, NOT the content.
    // Clients fetch the encrypted content separately.
    //
    // BEST-EFFORT : le message est DÉJÀ persisté ci-dessus. Une panne Pusher
    // (creds invalides, quota du plan atteint, réseau) ne doit jamais faire
    // échouer un envoi réussi — sinon l'utilisateur voit une erreur 500 pour
    // un message pourtant bien enregistré (bug prod observé). Même philosophie
    // que le rate limiter et que la notif « new-match » dans /api/likes : on
    // log et on dégrade, on ne bloque pas l'utilisateur sur une panne d'infra.
    try {
      const channel = getPusherChannel(conversationId);
      await pusher.trigger(channel, 'new-message', {
        id: message.id,
        senderId: message.senderId,
        createdAt: message.createdAt,
      });
    } catch (pusherError) {
      console.error('Pusher new-message notification error:', pusherError);
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Message create error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}