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
  /** Agrégat : nombre total de réactions pour ce couple (messageId, emoji). */
  count: number;
  /** Côté client : a-t-il été ajouté (true) ou supprimé (false) par l'auteur. */
  added?: boolean;
}

/**
 * Forme renvoyée à un user authentifié : à la fois les compteurs agrégés
 * et les réactions qu'il a lui-même posées (pour l'état actif des boutons).
 */
export interface SquareReactionsBundle {
  counts: Record<string, Record<string, number>>;
  mine: Record<string, string[]>;
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
  const data = 'data' in event ? event.data : '';
  const payload = `event: ${event.type}\ndata: ${JSON.stringify(data)}\n\n`;
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

/**
 * Récupère pour un ensemble de messages :
 *  - counts : map (messageId -> emoji -> total)
 *  - mine   : map (messageId -> liste d'emojis sur lesquels le user a réagi)
 *
 * Permet à la place de rendre l'état actif des boutons à la première
 * connexion, sans nécessiter un appel séparé.
 */
export async function getReactionsForMessages(
  messageIds: string[],
  userId: string,
): Promise<SquareReactionsBundle> {
  const counts: Record<string, Record<string, number>> = {};
  const mine: Record<string, string[]> = {};

  if (messageIds.length === 0) {
    return { counts, mine };
  }

  // Une seule requête pour les compteurs agrégés.
  const grouped = await getDb().squareReaction.groupBy({
    by: ['messageId', 'emoji'],
    where: { messageId: { in: messageIds } },
    _count: { _all: true },
  });

  for (const row of grouped) {
    if (!counts[row.messageId]) counts[row.messageId] = {};
    counts[row.messageId][row.emoji] = row._count._all;
  }

  // Et une pour savoir quelles lignes appartiennent au user courant.
  const mineRows = await getDb().squareReaction.findMany({
    where: { messageId: { in: messageIds }, userId },
    select: { messageId: true, emoji: true },
  });

  for (const row of mineRows) {
    if (!mine[row.messageId]) mine[row.messageId] = [];
    mine[row.messageId].push(row.emoji);
  }

  return { counts, mine };
}
