export interface SquareMessage {
  id: string;
  pseudonym: string;
  content: string;
  type: 'text' | 'emoji' | 'reaction' | 'gif' | 'polite' | 'riddle';
  timestamp: number;
}

const MAX_MESSAGES = 50;
let messages: SquareMessage[] = [];
let messageIdCounter = 0;

// Active SSE connections
const connections = new Set<ReadableStreamDefaultController>();

export function addMessage(msg: Omit<SquareMessage, 'id' | 'timestamp'>): SquareMessage {
  const message: SquareMessage = {
    ...msg,
    id: `sq_${++messageIdCounter}`,
    timestamp: Date.now(),
  };

  messages.push(message);
  if (messages.length > MAX_MESSAGES) {
    messages = messages.slice(-MAX_MESSAGES);
  }

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

export function getMessages(): SquareMessage[] {
  return [...messages];
}

export function addConnection(controller: ReadableStreamDefaultController): () => void {
  connections.add(controller);
  return () => {
    connections.delete(controller);
  };
}