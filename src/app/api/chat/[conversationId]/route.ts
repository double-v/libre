import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';

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

    const conversation = await getDb().conversation.findUnique({
      where: { id: conversationId },
      include: {
        match: {
          select: { id: true, userA: true, userB: true },
        },
        userARel: {
          select: { id: true, displayName: true, profile: { select: { photos: true } } },
        },
        userBRel: {
          select: { id: true, displayName: true, profile: { select: { photos: true } } },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Verify user is a participant in the conversation's match
    const isParticipant =
      conversation.userA === userId || conversation.userB === userId;
    if (!isParticipant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const otherUser =
      conversation.userA === userId ? conversation.userBRel : conversation.userARel;

    return NextResponse.json(
      {
        id: conversation.id,
        matchId: conversation.matchId,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        otherUser: {
          id: otherUser.id,
          displayName: otherUser.displayName,
          photos: otherUser.profile?.photos ?? [],
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Conversation fetch error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}