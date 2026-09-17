import webPush from 'web-push';
import { getDb } from '@/lib/db';

/**
 * Envoi Web Push côté serveur (#392/#393, spec 003 R8/R9).
 *
 * Tout est best-effort : les routes appellent `after(() => sendPush…())`
 * après avoir persisté, et rien ici ne lève — un push qui échoue ne doit
 * jamais changer la réponse d'une route (SC-008). Les journaux ne portent ni
 * identifiant de compte ni endpoint (une adresse d'envoi est une donnée
 * personnelle) : un motif, un statut, au plus un identifiant de conversation.
 *
 * Sans `VAPID_PRIVATE_KEY`, tout est no-op journalisé : la fonctionnalité se
 * dégrade, l'app tourne (même motif que le stub `trust/notify.ts`).
 *
 * Serveur uniquement : importé par des routes API, jamais par un composant.
 * (Pas de `server-only` — le repo ne l'a pas, et `web-push` casserait de
 * toute façon un bundle navigateur.)
 */

export type PushKind = 'message' | 'match' | 'admin-report' | 'admin-feedback';

/** Charge utile lue par `public/sw.js` (contracts/events.md). Jamais de contenu ni de nom. */
export interface PushPayload {
  kind: PushKind;
  title: string;
  body: string;
  url: string;
  tag: string;
}

/**
 * Construit la charge utile d'un `kind`. Le second argument accepte ce que
 * l'appelant a sous la main (l'objet message, le signalement…) mais on n'en
 * lit QUE `conversationId` : c'est la whitelist qui garantit SC-006, pas la
 * discipline de chaque appelant.
 */
export function buildPayload(kind: PushKind, ctx: { conversationId?: string } & Record<string, unknown>): PushPayload {
  switch (kind) {
    case 'message': {
      const id = String(ctx.conversationId ?? '');
      return { kind, title: 'Nouveau message', body: 'Quelqu’un t’a écrit.', url: `/chat/${id}`, tag: `conv-${id}` };
    }
    case 'match':
      return { kind, title: 'Nouveau match', body: 'Vous vous êtes plu.', url: '/messages', tag: 'match' };
    case 'admin-report':
      return { kind, title: 'Nouveau signalement', body: 'Un signalement attend.', url: '/admin/reports', tag: 'admin-reports' };
    case 'admin-feedback':
      return { kind, title: 'Nouveau retour', body: 'Un retour attend.', url: '/admin/feedback', tag: 'admin-feedback' };
  }
}

const DAY = 24 * 3600;
/** Un message ou un match n'a plus de sens après un jour ; une file admin attend. */
const TTL: Record<PushKind, number> = { message: DAY, match: DAY, 'admin-report': 7 * DAY, 'admin-feedback': 7 * DAY };

interface StoredSubscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

function configured(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!pub || !priv || !subject) {
    console.info('push.disabled', { reason: 'vapid_missing' });
    return false;
  }
  try {
    webPush.setVapidDetails(subject, pub, priv);
  } catch (err) {
    // Sujet sans mailto:, clé de mauvaise longueur… — une faute de saisie sur
    // Vercel doit se voir dans les journaux, pas disparaître dans un .catch().
    console.error('push.send.failed', { status: 'vapid_config', message: (err as Error)?.message?.slice(0, 80) });
    return false;
  }
  return true;
}

async function sendToSubscriptions(subs: StoredSubscription[], payload: PushPayload): Promise<void> {
  const db = getDb();
  const body = JSON.stringify(payload);
  const options = { TTL: TTL[payload.kind], urgency: 'normal' as const };
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webPush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, options);
        await db.pushSubscription.update({ where: { id: s.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
      } catch (err) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          // Abonnement révoqué côté navigateur : on cesse d'y écrire.
          await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
          return;
        }
        console.error('push.send.failed', { kind: payload.kind, status: status ?? 'unknown' });
      }
    }),
  );
}

async function sendWhere(where: Record<string, unknown>, payload: PushPayload): Promise<void> {
  if (!configured()) return;
  try {
    const subs = await getDb().pushSubscription.findMany({
      where,
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
    if (subs.length === 0) return;
    await sendToSubscriptions(subs, payload);
  } catch (err) {
    console.error('push.send.failed', { kind: payload.kind, status: 'db', message: (err as Error)?.message?.slice(0, 80) });
  }
}

/** Tous les appareils abonnés d'un compte. */
export function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  return sendWhere({ userId }, payload);
}

/** Tous les appareils abonnés de tous les comptes ADMIN (#393). */
export function sendPushToAdmins(payload: PushPayload): Promise<void> {
  // Insensible à la casse, comme `auth.ts` et `admin.ts` (`toUpperCase() === 'ADMIN'`).
  return sendWhere({ user: { role: { equals: 'ADMIN', mode: 'insensitive' } } }, payload);
}
