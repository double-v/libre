/**
 * Tests — abonnement push de l'appareil (#392, T058).
 *
 * `enablePush` : permission → subscribe → POST, dans cet ordre, et rien après
 * un refus. `disablePush` : DELETE serveur PUIS unsubscribe (le serveur a
 * besoin de la session, le navigateur non), tolérant à l'absence
 * d'abonnement. Le module `platform` est mocké : ici on teste l'enchaînement.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSupport = vi.fn();
vi.mock('../platform', () => ({ getPushSupport: () => mockSupport() }));

const { enablePush, disablePush, getPushState } = await import('../client');

const fakeSub = {
  endpoint: 'https://push.example/abc',
  toJSON: () => ({ endpoint: 'https://push.example/abc', keys: { p256dh: 'P', auth: 'A' } }),
  unsubscribe: vi.fn().mockResolvedValue(true),
};
const pushManager = { getSubscription: vi.fn(), subscribe: vi.fn() };
const fetchMock = vi.fn();
const requestPermission = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockSupport.mockReturnValue({ supported: true, iosNotInstalled: false, permission: 'default' });
  pushManager.getSubscription.mockResolvedValue(null);
  pushManager.subscribe.mockResolvedValue(fakeSub);
  fetchMock.mockResolvedValue({ ok: true });
  requestPermission.mockResolvedValue('granted');
  vi.stubGlobal('fetch', fetchMock);
  Object.defineProperty(navigator, 'serviceWorker', { value: { ready: Promise.resolve({ pushManager }) }, configurable: true });
  (window as unknown as { Notification: unknown }).Notification = { permission: 'default', requestPermission };
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'VAPIDPUB';
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete (window as unknown as { Notification?: unknown }).Notification;
});

describe('getPushState', () => {
  it('on / off selon l’abonnement local', async () => {
    expect(await getPushState()).toBe('off');
    pushManager.getSubscription.mockResolvedValue(fakeSub);
    expect(await getPushState()).toBe('on');
  });

  it('un abonnement local est ré-enregistré au passage (compte changé sans logout)', async () => {
    pushManager.getSubscription.mockResolvedValue(fakeSub);
    await getPushState();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/push/subscriptions', expect.objectContaining({ method: 'POST' })));
  });

  it('sans abonnement local : aucun POST', async () => {
    await getPushState();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('états sans abonnement : unsupported, ios-not-installed, denied — sans lire le SW', async () => {
    mockSupport.mockReturnValue({ supported: false, iosNotInstalled: false, permission: 'default' });
    expect(await getPushState()).toBe('unsupported');
    mockSupport.mockReturnValue({ supported: false, iosNotInstalled: true, permission: 'default' });
    expect(await getPushState()).toBe('ios-not-installed');
    mockSupport.mockReturnValue({ supported: true, iosNotInstalled: false, permission: 'denied' });
    expect(await getPushState()).toBe('denied');
    // Aucun des trois n'interroge le service worker : l'état est connu d'avance.
    expect(pushManager.getSubscription).not.toHaveBeenCalled();
  });

  it('un service worker jamais prêt ne bloque pas : off après le délai', async () => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, 'serviceWorker', { value: { ready: new Promise(() => {}) }, configurable: true });
    const pending = getPushState();
    await vi.advanceTimersByTimeAsync(3100);
    expect(await pending).toBe('off');
    vi.useRealTimers();
  });
});

describe('enablePush', () => {
  it('demande la permission, s’abonne avec la clé VAPID, POSTe, → on', async () => {
    expect(await enablePush()).toBe('on');
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(pushManager.subscribe).toHaveBeenCalledWith({ userVisibleOnly: true, applicationServerKey: 'VAPIDPUB' });
    expect(fetchMock).toHaveBeenCalledWith('/api/push/subscriptions', expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ endpoint: 'https://push.example/abc', keys: { p256dh: 'P', auth: 'A' } });
    const order = [requestPermission, pushManager.subscribe, fetchMock].map((m) => m.mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('refus → denied, sans subscribe ni POST', async () => {
    requestPermission.mockResolvedValue('denied');
    expect(await enablePush()).toBe('denied');
    expect(pushManager.subscribe).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('permission déjà accordée : ne la redemande pas', async () => {
    mockSupport.mockReturnValue({ supported: true, iosNotInstalled: false, permission: 'granted' });
    expect(await enablePush()).toBe('on');
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('abonnement local déjà présent : le ré-enregistre (upsert) sans re-subscribe', async () => {
    mockSupport.mockReturnValue({ supported: true, iosNotInstalled: false, permission: 'granted' });
    pushManager.getSubscription.mockResolvedValue(fakeSub);
    expect(await enablePush()).toBe('on');
    expect(pushManager.subscribe).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('non supporté : rien demandé', async () => {
    mockSupport.mockReturnValue({ supported: false, iosNotInstalled: true, permission: 'default' });
    expect(await enablePush()).toBe('ios-not-installed');
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('POST en échec → off ET abonnement navigateur retiré (sinon « on » mensonger au prochain montage)', async () => {
    fetchMock.mockResolvedValue({ ok: false });
    expect(await enablePush()).toBe('off');
    expect(fakeSub.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('abonnement pris sous une autre clé VAPID (rotation) : se désabonne puis se réabonne', async () => {
    mockSupport.mockReturnValue({ supported: true, iosNotInstalled: false, permission: 'granted' });
    const stale = { ...fakeSub, unsubscribe: vi.fn().mockResolvedValue(true), options: { applicationServerKey: new Uint8Array([1, 2, 3]).buffer } };
    pushManager.getSubscription.mockResolvedValue(stale);
    expect(await enablePush()).toBe('on');
    expect(stale.unsubscribe).toHaveBeenCalledTimes(1);
    expect(pushManager.subscribe).toHaveBeenCalledTimes(1);
  });

  it('abonnement sous la clé courante : conservé', async () => {
    mockSupport.mockReturnValue({ supported: true, iosNotInstalled: false, permission: 'granted' });
    // 'VAPIDPUB' en base64url → octets ; l'abonnement porte exactement ces octets.
    const bytes = Uint8Array.from(atob('VAPIDPUB'), (c) => c.charCodeAt(0));
    const fresh = { ...fakeSub, unsubscribe: vi.fn(), options: { applicationServerKey: bytes.buffer } };
    pushManager.getSubscription.mockResolvedValue(fresh);
    expect(await enablePush()).toBe('on');
    expect(fresh.unsubscribe).not.toHaveBeenCalled();
    expect(pushManager.subscribe).not.toHaveBeenCalled();
  });
});

describe('disablePush', () => {
  it('DELETE serveur puis unsubscribe, → off', async () => {
    pushManager.getSubscription.mockResolvedValue(fakeSub);
    expect(await disablePush()).toBe('off');
    expect(fetchMock).toHaveBeenCalledWith('/api/push/subscriptions', expect.objectContaining({ method: 'DELETE' }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ endpoint: 'https://push.example/abc' });
    expect(fakeSub.unsubscribe).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.invocationCallOrder[0]).toBeLessThan(fakeSub.unsubscribe.mock.invocationCallOrder[0]);
  });

  it('tolère l’absence d’abonnement', async () => {
    expect(await disablePush()).toBe('off');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('un DELETE en panne n’empêche pas le désabonnement local', async () => {
    pushManager.getSubscription.mockResolvedValue(fakeSub);
    fetchMock.mockRejectedValue(new Error('réseau'));
    expect(await disablePush()).toBe('off');
    expect(fakeSub.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
