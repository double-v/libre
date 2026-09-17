/**
 * Capacités push de l'appareil courant (#392, spec 003 R12).
 *
 * Trois faits, lus sans rien demander (FR-015 : aucune permission sollicitée
 * au montage) : le navigateur sait-il faire ; sur iPhone, l'app est-elle
 * installée (Safari n'expose Web Push qu'en standalone, iOS 16.4+) ; où en
 * est la permission. `PushSettings` en déduit son état sans effet de bord.
 */
export type PushPermission = 'default' | 'granted' | 'denied';

export interface PushSupport {
  supported: boolean;
  iosNotInstalled: boolean;
  permission: PushPermission;
}

function isIos(ua: string): boolean {
  // iPadOS se présente comme un Mac ; le tactile le trahit.
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches);
}

export function getPushSupport(): PushSupport {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { supported: false, iosNotInstalled: false, permission: 'default' };
  }
  const ios = isIos(navigator.userAgent);
  const iosNotInstalled = ios && !isStandalone();
  const supported =
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !iosNotInstalled;
  const permission = ('Notification' in window ? (Notification.permission as PushPermission) : 'default') ?? 'default';
  return { supported, iosNotInstalled, permission };
}
