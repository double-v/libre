/**
 * Tests — capacités push de l'appareil (#392, T057).
 *
 * `getPushSupport()` ne demande rien : il lit. On simule les trois mondes
 * qui changent la copie de `PushSettings` : navigateur sans PushManager,
 * iPhone hors app installée, permission déjà décidée.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { getPushSupport } from '../platform';

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36';

function stubEnv({ ua, pushManager = true, permission = 'default', standalone = false }: { ua: string; pushManager?: boolean; permission?: string; standalone?: boolean }) {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
  Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true });
  if (pushManager) (window as unknown as { PushManager: unknown }).PushManager = function PushManager() {};
  else delete (window as unknown as { PushManager?: unknown }).PushManager;
  (window as unknown as { Notification: unknown }).Notification = { permission };
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({ matches: standalone && q.includes('standalone') })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  delete (window as unknown as { PushManager?: unknown }).PushManager;
  delete (window as unknown as { Notification?: unknown }).Notification;
});

describe('getPushSupport', () => {
  it('supported=false sans PushManager', () => {
    stubEnv({ ua: ANDROID_UA, pushManager: false });
    expect(getPushSupport()).toEqual({ supported: false, iosNotInstalled: false, permission: 'default' });
  });

  it('Android Chrome : supporté, permission reflétée', () => {
    stubEnv({ ua: ANDROID_UA, permission: 'granted' });
    expect(getPushSupport()).toEqual({ supported: true, iosNotInstalled: false, permission: 'granted' });
  });

  it('iOS hors app installée : iosNotInstalled=true et non supporté, même si PushManager existe', () => {
    stubEnv({ ua: IOS_UA, permission: 'default' });
    expect(getPushSupport()).toEqual({ supported: false, iosNotInstalled: true, permission: 'default' });
  });

  it('iOS installée (display-mode: standalone) : supporté', () => {
    stubEnv({ ua: IOS_UA, standalone: true });
    expect(getPushSupport()).toEqual({ supported: true, iosNotInstalled: false, permission: 'default' });
  });

  it('permission refusée : reflétée telle quelle', () => {
    stubEnv({ ua: ANDROID_UA, permission: 'denied' });
    expect(getPushSupport().permission).toBe('denied');
  });
});
