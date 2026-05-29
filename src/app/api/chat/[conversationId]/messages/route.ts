import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { messageSchema } from '@/lib/validators';
import { pusher, getPusherChannel } from '@/lib/pusher';

// ---------------------------------------------------------------------------
// Helper: verify the authenticated user is a participant in the conversation
// ---------------------------------------------------------------------------
async function verifyParticipant(conversationId: string, userId: string) {
  const conversation = await getDb().conversation.findUnique({
    where: { id: conversationId },
    select: { userA: true, userB: true },
  });
  if (!conversation) return { error: 'Not found' as const, status: 404 };
  if (conversation.userA !== userId && conversation.userB !== userId) {
    return { error: 'Forbidden' as const, status: 403 };
  }
  return { conversation };
}

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

    // Return in chronological order (oldest first)
    const sorted = [...messages].reverse();

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

    const { conversationId } = await params;
    const userId = session.user.id;

    const result = await verifyParticipant(conversationId, userId);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const body = await request.json();
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
    const channel = getPusherChannel(conversationId);
    await pusher.trigger(channel, 'new-message', {
      id: message.id,
      senderId: message.senderId,
      createdAt: message.createdAt,
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Message create error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}