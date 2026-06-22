import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { pusher } from '@/lib/pusher';
import { rateLimit, limits } from '@/lib/rate-limit';

const PUSHER_MAX_SOCKET_ID = 200;
const PUSHER_MAX_CHANNEL_NAME = 200;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const rl = await rateLimit(`pusher:${session.user.id}`, limits.api.limit, limits.api.windowMs);
    if (!rl.success) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }

    const formData = await request.formData();
    const socketId = formData.get('socket_id') as string;
    const channelName = formData.get('channel_name') as string;

    if (!socketId || !channelName) {
      return new NextResponse('Missing socket_id or channel_name', { status: 400 });
    }

    if (socketId.length > PUSHER_MAX_SOCKET_ID || channelName.length > PUSHER_MAX_CHANNEL_NAME) {
      return new NextResponse('socket_id or channel_name too long', { status: 400 });
    }

    // Allow private-chat- and private-user- channels
    if (channelName.startsWith('private-chat-')) {
      const conversationId = channelName.replace('private-chat-', '');

      // Verify user is a participant in this conversation
      const conversation = await getDb().conversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation) {
        return new NextResponse('Conversation not found', { status: 404 });
      }

      if (conversation.userA !== session.user.id && conversation.userB !== session.user.id) {
        return new NextResponse('Forbidden', { status: 403 });
      }
    } else if (channelName.startsWith('private-user-')) {
      // User can only subscribe to their own channel
      const channelUserId = channelName.replace('private-user-', '');
      if (channelUserId !== session.user.id) {
        return new NextResponse('Forbidden', { status: 403 });
      }
    } else {
      return new NextResponse('Forbidden channel', { status: 403 });
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