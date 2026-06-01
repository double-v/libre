import { getDb } from '@/lib/db';

export interface SquareMessage {
  id: string;
  pseudonym: string;
  content: string;
  type: 'text' | 'emoji' | 'reaction' | 'gif' | 'polite' | 'riddle' | 'system';
  isAdmin: boolean;
  isSystem: boolean;
  themeConfigId?: string | null;
  timestamp: number;
}

export interface SquareReaction {
  messageId: string;
  emoji: string;
  count: number;
}

const MAX_MESSAGES = 84;

// Active SSE connections for real-time broadcast
const connections = new Set<ReadableStreamDefaultController>();

type SSEEvent =
  | { type: 'message'; data: SquareMessage }
  | { type: 'reset' }
  | { type: 'system'; data: SquareMessage }
  | { type: 'reaction'; data: SquareReaction }
  | { type: 'delete'; data: { messageId: string } };

function broadcastEvent(event: SSEEvent): void {
  const payload = `event: ${event.type}\ndata: ${JSON.stringify(event.data ?? '')}\n\n`;
  const encoded = new TextEncoder().encode(payload);
  for (const controller of connections) {
    try {
      controller.enqueue(encoded);
    } catch {
      connections.delete(controller);
    }
  }
}

/**
 * Add a message to the database and broadcast it to all connected SSE clients.
 */
export async function addMessage(msg: Omit<SquareMessage, 'id' | 'timestamp' | 'isSystem'>): Promise<SquareMessage> {
  const row = await getDb().squareMessage.create({
    data: {
      pseudonym: msg.pseudonym,
      content: msg.content,
      type: msg.type,
      isAdmin: msg.isAdmin,
      isSystem: false,
      themeConfigId: msg.themeConfigId ?? null,
    },
  });

  const message: SquareMessage = {
    id: row.id,
    pseudonym: row.pseudonym,
    content: row.content,
    type: row.type as SquareMessage['type'],
    isAdmin: row.isAdmin,
    isSystem: row.isSystem,
    themeConfigId: row.themeConfigId,
    timestamp: row.createdAt.getTime(),
  };

  broadcastEvent({ type: 'message', data: message });
  return message;
}

/**
 * Add a system message and broadcast it.
 */
export async function addSystemMessage(content: string): Promise<SquareMessage> {
  const row = await getDb().squareMessage.create({
    data: {
      pseudonym: '📢 Système',
      content,
      type: 'system',
      isAdmin: true,
      isSystem: true,
    },
  });

  const message: SquareMessage = {
    id: row.id,
    pseudonym: row.pseudonym,
    content: row.content,
    type: 'system',
    isAdmin: true,
    isSystem: true,
    themeConfigId: row.themeConfigId,
    timestamp: row.createdAt.getTime(),
  };

  broadcastEvent({ type: 'system', data: message });
  return message;
}

/**
 * Broadcast a reaction update to all SSE clients.
 */
export function broadcastReaction(data: SquareReaction): void {
  broadcastEvent({ type: 'reaction', data });
}

/**
 * Broadcast a message deletion to all SSE clients.
 */
export function broadcastDelete(messageId: string): void {
  broadcastEvent({ type: 'delete', data: { messageId } });
}

/**
 * Broadcast a reset event to all SSE clients.
 */
export function broadcastReset(): void {
  broadcastEvent({ type: 'reset' });
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
    isSystem: row.isSystem,
    themeConfigId: row.themeConfigId,
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