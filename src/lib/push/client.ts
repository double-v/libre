import { getPushSupport, type PushPermission } from './platform';

/**
 * Abonnement push de CET appareil (#392, spec 003 R12/R13).
 *
 * L'état « abonné » est local au navigateur (`pushManager.getSubscription`),
 * jamais un réglage de compte : les permissions vivent par appareil, et un
 * autre compte sur le même navigateur ne doit pas hériter d'un abonnement.
 * `enablePush()` doit être appelé depuis un gestionnaire de clic
 * (`requestPermission` l'exige). Tout est tolérant : pas d'abonnement, pas de
 * service worker, réseau en panne — on renvoie un état, on ne lève pas.
 */
export type PushState = 'unsupported' | 'ios-not-installed' | 'denied' | 'off' | 'on';

const API = '/api/push/subscriptions';

function applicationServerKey(): string | undefined {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || undefined;
}

/** `serviceWorker.ready` ne résout que quand un SW est ACTIF — jamais, sur une page
 *  où l'enregistrement a échoué. On borne l'attente : l'UI ne doit pas rester muette. */
const READY_TIMEOUT_MS = 3000;

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), READY_TIMEOUT_MS)),
    ]);
  } catch {
    return null;
  }
}

export async function getDeviceSubscription(): Promise<PushSubscription | null> {
  const reg = await registration();
  if (!reg) return null;
  try {
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

function stateFrom(permission: PushPermission, subscribed: boolean): PushState {
  const support = getPushSupport();
  if (support.iosNotInstalled) return 'ios-not-installed';
  if (!support.supported) return 'unsupported';
  if (permission === 'denied') return 'denied';
  return subscribed ? 'on' : 'off';
}

/**
 * État courant, sans rien demander (FR-015). Un abonnement local est
 * ré-enregistré au passage (upsert, best-effort) : si la session précédente
 * s'est terminée sans `logout()` (JWT expiré, cookies vidés), l'endpoint est
 * encore rattaché à l'ancien compte — et l'appareil recevrait SES messages.
 */
export async function getPushState(): Promise<PushState> {
  const support = getPushSupport();
  // Non supporté ou refusé : l'état est connu sans interroger le service worker.
  if (!support.supported || support.permission === 'denied') return stateFrom(support.permission, false);
  const sub = await getDeviceSubscription();
  if (sub) void register(sub);
  return stateFrom(support.permission, sub !== null);
}

/** Décode la clé VAPID publique (base64url) pour la comparer à celle de l'abonnement. */
function decodeKey(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(b64url.length / 4) * 4, '=');
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/**
 * Un abonnement pris sous une autre clé VAPID (rotation) ne recevra plus rien :
 * chaque envoi ferait 401/403, jamais 404/410, donc jamais nettoyé côté
 * serveur. On le détecte ici pour se réabonner.
 */
function boundToCurrentKey(sub: PushSubscription): boolean {
  const key = applicationServerKey();
  const bound = sub.options?.applicationServerKey;
  if (!key || !bound) return true; // rien à comparer : on ne casse pas un abonnement valide
  const a = new Uint8Array(bound);
  const b = decodeKey(key);
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

async function register(sub: PushSubscription): Promise<boolean> {
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** À appeler dans un gestionnaire de clic. Renvoie l'état final. */
export async function enablePush(): Promise<PushState> {
  const support = getPushSupport();
  if (!support.supported) return stateFrom(support.permission, false);

  let permission: PushPermission = support.permission;
  if (permission !== 'granted') {
    try {
      permission = (await Notification.requestPermission()) as PushPermission;
    } catch {
      permission = 'denied';
    }
  }
  if (permission !== 'granted') return stateFrom(permission, false);

  const reg = await registration();
  if (!reg) return 'off';
  let sub: PushSubscription | null = null;
  try {
    sub = await reg.pushManager.getSubscription();
    if (sub && !boundToCurrentKey(sub)) {
      await sub.unsubscribe();
      sub = null;
    }
    sub ??= await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey(),
    });
  } catch {
    return 'off';
  }
  // Le serveur peut ignorer un abonnement local (compte changé sur ce
  // navigateur) : on le (ré)enregistre toujours — c'est un upsert.
  const ok = await register(sub);
  if (!ok) {
    // Sans ligne côté serveur, un abonnement navigateur serait un mensonge :
    // « on » à l'écran, rien qui arrive jamais. On le retire.
    try {
      await sub.unsubscribe();
    } catch {
      // best-effort
    }
    return 'off';
  }
  return 'on';
}

/** Désabonne l'appareil : le serveur d'abord (il faut la session), puis le navigateur. */
export async function disablePush(): Promise<PushState> {
  const sub = await getDeviceSubscription();
  if (sub) {
    try {
      await fetch(API, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
    } catch {
      // Le DELETE serveur est best-effort : le 410 au prochain envoi fera le ménage.
    }
    try {
      await sub.unsubscribe();
    } catch {
      // idem
    }
  }
  return stateFrom(getPushSupport().permission, false);
}
