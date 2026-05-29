import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMessages, addConnection } from '@/lib/square/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const initialMessages = getMessages();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial messages as a batch
      const encoder = new TextEncoder();
      for (const msg of initialMessages) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
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

      // Best-effort cleanup
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