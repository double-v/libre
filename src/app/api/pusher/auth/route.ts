import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { pusher } from '@/lib/pusher';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const formData = await request.formData();
    const socketId = formData.get('socket_id') as string;
    const channelName = formData.get('channel_name') as string;

    if (!socketId || !channelName) {
      return new NextResponse('Missing socket_id or channel_name', { status: 400 });
    }

    // Only allow private-chat- channels
    if (!channelName.startsWith('private-chat-')) {
      return new NextResponse('Forbidden channel', { status: 403 });
    }

    const conversationId = channelName.replace('private-chat-', '');

    // Verify user is a participant in this conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return new NextResponse('Conversation not found', { status: 404 });
    }

    if (conversation.userA !== session.user.id && conversation.userB !== session.user.id) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const authResponse = pusher.authorizeChannel(socketId, channelName);
    return new NextResponse(JSON.stringify(authResponse), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Pusher auth error:', error);
    return new NextResponse('Une erreur est survenue', { status: 500 });
  }
}