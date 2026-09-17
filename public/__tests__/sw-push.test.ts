/**
 * Tests — service worker, handlers push et notificationclick (#392, T055).
 *
 * `sw.js` n'est ni un module ni du TypeScript : on l'exécute dans un faux
 * `self` et on rejoue les événements. Ce qu'on verrouille (R11) : rien
 * n'est montré quand une fenêtre est visible ET au premier plan, ni sur une
 * charge illisible ; sinon `showNotification` avec le tag, l'icône et l'URL ;
 * un clic réutilise une fenêtre existante, sinon en ouvre une.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(process.cwd(), 'public/sw.js'), 'utf8');

type Listener = (event: unknown) => void;

function bootSw() {
  const listeners: Record<string, Listener> = {};
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const matchAll = vi.fn().mockResolvedValue([]);
  const openWindow = vi.fn().mockResolvedValue(undefined);
  const self = {
    addEventListener: (name: string, fn: Listener) => { listeners[name] = fn; },
    skipWaiting: vi.fn(),
    clients: { matchAll, openWindow, claim: vi.fn() },
    registration: { showNotification },
    location: { origin: 'https://libre.example' },
  };
  const caches = { open: vi.fn(), keys: vi.fn(), match: vi.fn() };
  new Function('self', 'caches', source)(self, caches);
  return { listeners, showNotification, matchAll, openWindow };
}

function pushEvent(payload: unknown, { unreadable = false } = {}) {
  const pending: Promise<unknown>[] = [];
  const event = {
    data: { json: () => { if (unreadable) throw new SyntaxError('bad json'); return payload; } },
    waitUntil: (p: Promise<unknown>) => { pending.push(p); },
  };
  return { event, settle: () => Promise.all(pending) };
}

const payload = { kind: 'message', title: 'Nouveau message', body: 'Quelqu’un t’a écrit.', url: '/chat/c1', tag: 'conv-c1' };

describe('sw.js — CACHE_NAME', () => {
  it('passe à libre-v3 pour déployer le nouveau SW', () => {
    expect(source).toMatch(/const CACHE_NAME = 'libre-v3'/);
  });
});

describe('sw.js — push', () => {
  let sw: ReturnType<typeof bootSw>;
  beforeEach(() => { sw = bootSw(); });

  it('montre la notification avec tag, icône, badge et url quand aucune fenêtre n’est visible', async () => {
    sw.matchAll.mockResolvedValue([{ visibilityState: 'hidden', focused: false }]);
    const { event, settle } = pushEvent(payload);
    sw.listeners.push(event);
    await settle();
    expect(sw.showNotification).toHaveBeenCalledWith('Nouveau message', expect.objectContaining({
      body: 'Quelqu’un t’a écrit.',
      tag: 'conv-c1',
      icon: '/icon-192.png',
      badge: '/icon-96.png',
      renotify: false,
      data: { url: '/chat/c1' },
    }));
  });

  it('ne montre rien si une fenêtre est visible ET au premier plan (Q2)', async () => {
    sw.matchAll.mockResolvedValue([{ visibilityState: 'visible', focused: true }]);
    const { event, settle } = pushEvent(payload);
    sw.listeners.push(event);
    await settle();
    expect(sw.showNotification).not.toHaveBeenCalled();
  });

  it('montre quand même si la fenêtre est visible mais pas au premier plan', async () => {
    sw.matchAll.mockResolvedValue([{ visibilityState: 'visible', focused: false }]);
    const { event, settle } = pushEvent(payload);
    sw.listeners.push(event);
    await settle();
    expect(sw.showNotification).toHaveBeenCalledTimes(1);
  });

  it('charge illisible ou sans titre : rien', async () => {
    const bad = pushEvent(null, { unreadable: true });
    sw.listeners.push(bad.event);
    await bad.settle();
    const noTitle = pushEvent({ body: 'x' });
    sw.listeners.push(noTitle.event);
    await noTitle.settle();
    expect(sw.showNotification).not.toHaveBeenCalled();
    expect(sw.matchAll).not.toHaveBeenCalled();
  });
});

describe('sw.js — notificationclick', () => {
  let sw: ReturnType<typeof bootSw>;
  beforeEach(() => { sw = bootSw(); });

  function click(url: string) {
    const pending: Promise<unknown>[] = [];
    const notification = { close: vi.fn(), data: { url } };
    sw.listeners.notificationclick({ notification, waitUntil: (p: Promise<unknown>) => { pending.push(p); } });
    return { notification, settle: () => Promise.all(pending) };
  }

  it('ferme, puis focus + navigate sur une fenêtre existante', async () => {
    const win = { focus: vi.fn().mockResolvedValue(undefined), navigate: vi.fn().mockResolvedValue(undefined) };
    sw.matchAll.mockResolvedValue([win]);
    const { notification, settle } = click('/chat/c1');
    await settle();
    expect(notification.close).toHaveBeenCalled();
    expect(win.focus).toHaveBeenCalled();
    expect(win.navigate).toHaveBeenCalledWith('/chat/c1');
    expect(sw.openWindow).not.toHaveBeenCalled();
  });

  it('fenêtre non contrôlée (navigate rejette) : ouvre une fenêtre plutôt que rien', async () => {
    const win = { focus: vi.fn().mockResolvedValue(undefined), navigate: vi.fn().mockRejectedValue(new TypeError('not controlled')) };
    sw.matchAll.mockResolvedValue([win]);
    const { settle } = click('/chat/c1');
    await settle();
    expect(sw.openWindow).toHaveBeenCalledWith('/chat/c1');
  });

  it('ouvre une fenêtre sinon', async () => {
    const { settle } = click('/messages');
    await settle();
    expect(sw.openWindow).toHaveBeenCalledWith('/messages');
  });
});
