import { getDb } from '@/lib/db';

export interface SquareMessage {
  id: string;
  pseudonym: string;
  content: string;
  type: 'text' | 'emoji' | 'reaction' | 'gif' | 'polite' | 'riddle';
  isAdmin: boolean;
  timestamp: number;
}

const MAX_MESSAGES = 84;

// Active SSE connections for real-time broadcast
const connections = new Set<ReadableStreamDefaultController>();

/**
 * Add a message to the database and broadcast it to all connected SSE clients.
 */
export async function addMessage(msg: Omit<SquareMessage, 'id' | 'timestamp'>): Promise<SquareMessage> {
  const row = await getDb().squareMessage.create({
    data: {
      pseudonym: msg.pseudonym,
      content: msg.content,
      type: msg.type,
      isAdmin: msg.isAdmin,
    },
  });

  const message: SquareMessage = {
    id: row.id,
    pseudonym: row.pseudonym,
    content: row.content,
    type: row.type as SquareMessage['type'],
    isAdmin: row.isAdmin,
    timestamp: row.createdAt.getTime(),
  };

  // Broadcast to all SSE connections
  const data = `data: ${JSON.stringify(message)}\n\n`;
  for (const controller of connections) {
    try {
      controller.enqueue(new TextEncoder().encode(data));
    } catch {
      connections.delete(controller);
    }
  }

  return message;
}

/**
 * Get the last MAX_MESSAGES from the database.
 */
export async function getMessages(): Promise<SquareMessage[]> {
  const rows = await getDb().squareMessage.findMany({
    orderBy: { createdAt: 'asc' },
    take: MAX_MESSAGES,
  });

  return rows.map((row) => ({
    id: row.id,
    pseudonym: row.pseudonym,
    content: row.content,
    type: row.type as SquareMessage['type'],
    isAdmin: row.isAdmin,
    timestamp: row.createdAt.getTime(),
  }));
}

/**
 * Register an SSE connection. Returns a cleanup function.
 */
export function addConnection(controller: ReadableStreamDefaultController): () => void {
  connections.add(controller);
  return () => {
    connections.delete(controller);
  };
}