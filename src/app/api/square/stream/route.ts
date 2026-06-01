import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMessages, addConnection } from '@/lib/square/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const initialMessages = await getMessages();

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial messages as individual typed events
      for (const msg of initialMessages) {
        const eventType = msg.isSystem ? 'system' : 'message';
        controller.enqueue(encoder.encode(`event: ${eventType}\ndata: ${JSON.stringify(msg)}\n\n`));
      }

      // Keep connection alive with periodic heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(':heartbeat\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Register for new messages
      const cleanup = addConnection(controller);

      // Clean up on close
      const closeHandler = () => {
        cleanup();
        clearInterval(heartbeat);
        try { controller.close(); } catch {}
      };

      process.on('SIGTERM', closeHandler);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}