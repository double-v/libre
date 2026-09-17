/**
 * Déclaration minimale de `web-push` (#392) — le sous-ensemble qu'utilise
 * `src/lib/push/server.ts`. Plutôt qu'un `@types/web-push` de plus dans le
 * lock (cf. mémoire getlibre-npm-lock-plus-recent), on décrit ce qu'on appelle.
 * Même approche que `next-auth.d.ts` à côté.
 */
declare module 'web-push' {
  export interface PushSubscriptionLike {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }
  export interface RequestOptions {
    TTL?: number;
    urgency?: 'very-low' | 'low' | 'normal' | 'high';
    topic?: string;
  }
  export interface SendResult {
    statusCode: number;
    body: string;
    headers: Record<string, string>;
  }
  export interface WebPushError extends Error {
    statusCode: number;
    body: string;
    endpoint: string;
  }
  export function setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  export function sendNotification(
    subscription: PushSubscriptionLike,
    payload?: string | Buffer | null,
    options?: RequestOptions,
  ): Promise<SendResult>;
  export function generateVAPIDKeys(): { publicKey: string; privateKey: string };
  const webPush: {
    setVapidDetails: typeof setVapidDetails;
    sendNotification: typeof sendNotification;
    generateVAPIDKeys: typeof generateVAPIDKeys;
  };
  export default webPush;
}
