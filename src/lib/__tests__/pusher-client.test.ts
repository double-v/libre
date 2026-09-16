/**
 * Tests — client Pusher partagé (singleton côté navigateur, #389).
 *
 * Pusher facture par connexion et l'app ouvrait déjà trois sockets par onglet
 * (MatchDialog, /messages, /chat). Le singleton garantit une seule instance et
 * un comptage de références par canal : deux consommateurs du même canal ne
 * l'abonnent qu'une fois et ne le désabonnent qu'au dernier départ.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fakeChannel = { bind: vi.fn(), unbind: vi.fn() };
const fakeClient = {
  subscribe: vi.fn(() => fakeChannel),
  unsubscribe: vi.fn(),
  disconnect: vi.fn(),
};
const PusherCtor = vi.fn(function () {
  return fakeClient;
});
vi.mock('pusher-js', () => ({ __esModule: true, default: PusherCtor }));

describe('pusher-client', () => {
  beforeEach(() => {
    vi.resetModules();
    PusherCtor.mockClear();
    fakeClient.subscribe.mockClear();
    fakeClient.unsubscribe.mockClear();
    process.env.NEXT_PUBLIC_PUSHER_KEY = 'k';
    process.env.NEXT_PUBLIC_PUSHER_CLUSTER = 'eu';
  });

  it('renvoie la même instance à deux appels', async () => {
    const { getPusherClient } = await import('../pusher-client');
    const a = getPusherClient();
    const b = getPusherClient();
    expect(a).toBe(b);
    expect(PusherCtor).toHaveBeenCalledTimes(1);
    expect(PusherCtor).toHaveBeenCalledWith('k', expect.objectContaining({
      cluster: 'eu',
      channelAuthorization: expect.objectContaining({ endpoint: '/api/pusher/auth' }),
    }));
  });

  it("renvoie null sans clé publique, sans lever", async () => {
    delete process.env.NEXT_PUBLIC_PUSHER_KEY;
    const { getPusherClient, subscribeUserChannel } = await import('../pusher-client');
    expect(getPusherClient()).toBeNull();
    expect(subscribeUserChannel('u1')).toBeNull();
    expect(PusherCtor).not.toHaveBeenCalled();
  });

  it("compte les références : un seul subscribe, unsubscribe au dernier release", async () => {
    const { subscribeUserChannel } = await import('../pusher-client');
    const first = subscribeUserChannel('u1');
    const second = subscribeUserChannel('u1');
    expect(first?.channel).toBe(fakeChannel);
    expect(second?.channel).toBe(fakeChannel);
    expect(fakeClient.subscribe).toHaveBeenCalledTimes(1);
    expect(fakeClient.subscribe).toHaveBeenCalledWith('private-user-u1');

    first!.release();
    expect(fakeClient.unsubscribe).not.toHaveBeenCalled();
    second!.release();
    expect(fakeClient.unsubscribe).toHaveBeenCalledWith('private-user-u1');
  });

  it('un release en double ne descend pas sous zéro', async () => {
    const { subscribeUserChannel } = await import('../pusher-client');
    const sub = subscribeUserChannel('u1')!;
    sub.release();
    sub.release();
    expect(fakeClient.unsubscribe).toHaveBeenCalledTimes(1);
    // Un nouvel abonné après un release complet ré-abonne
    subscribeUserChannel('u1');
    expect(fakeClient.subscribe).toHaveBeenCalledTimes(2);
  });
});
