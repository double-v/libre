import Pusher from 'pusher';

// SECURITY NOTE (issue #152):
// Client events (client-triggered events on private/presence channels) are
// NOT enabled here. The Pusher app dashboard setting "Client events" must
// also remain OFF — enabling it would let any authenticated subscriber emit
// events to all other subscribers without a server round-trip, which is a
// potential abuse vector (spam, impersonation). All events are server-triggered
// via pusher.trigger() from API routes, which is the safe pattern.
export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER || 'eu',
});

export function getPusherChannel(conversationId: string) {
  return `private-chat-${conversationId}`;
}

export function getUserChannel(userId: string) {
  return `private-user-${userId}`;
}