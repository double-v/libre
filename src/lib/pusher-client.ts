import Pusher, { type Channel } from 'pusher-js';

/**
 * Client Pusher partagé côté navigateur (#389).
 *
 * Pourquoi un singleton : Pusher facture par connexion, et l'app ouvrait déjà
 * trois sockets par onglet (MatchDialog, /messages, /chat) — chacun avec sa
 * propre config. Ici une seule instance, une seule config d'autorisation, et un
 * comptage de références par canal pour que deux consommateurs d'un même canal
 * (ex. `useUnread` et `MatchDialog` sur `private-user-{id}`) ne l'abonnent qu'une
 * fois et ne le désabonnent qu'au départ du dernier.
 *
 * Sans `NEXT_PUBLIC_PUSHER_KEY` (env local incomplet, tests), tout renvoie
 * `null` : le temps réel est un confort, jamais une condition de fonctionnement.
 */

let client: Pusher | null = null;
const refCounts = new Map<string, number>();
const channels = new Map<string, Channel>();

export function getPusherClient(): Pusher | null {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  if (!key) return null;
  if (!client) {
    client = new Pusher(key, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
      channelAuthorization: { endpoint: '/api/pusher/auth', transport: 'ajax' },
    });
  }
  return client;
}

export interface ChannelHandle {
  channel: Channel;
  /** Rend sa référence ; le canal n'est désabonné qu'à la dernière. Idempotent. */
  release: () => void;
}

export function subscribeChannel(name: string): ChannelHandle | null {
  const pusher = getPusherClient();
  if (!pusher) return null;

  let channel = channels.get(name);
  if (!channel) {
    channel = pusher.subscribe(name);
    channels.set(name, channel);
  }
  refCounts.set(name, (refCounts.get(name) ?? 0) + 1);

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    const remaining = (refCounts.get(name) ?? 1) - 1;
    if (remaining <= 0) {
      refCounts.delete(name);
      channels.delete(name);
      pusher.unsubscribe(name);
    } else {
      refCounts.set(name, remaining);
    }
  };

  return { channel, release };
}

/** Canal privé d'un utilisateur — même convention que `getUserChannel` côté serveur. */
export function subscribeUserChannel(userId: string): ChannelHandle | null {
  return subscribeChannel(`private-user-${userId}`);
}
