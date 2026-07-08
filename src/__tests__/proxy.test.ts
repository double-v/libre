/**
 * Tests — proxy (guard de session) + cache court du contrôle user (issue #146)
 *
 * Le proxy faisait un `user.findUnique` à CHAQUE navigation protégée. #146
 * ajoute un cache mémoire TTL 30 s : navigations répétées = 1 seul hit DB, et
 * ban / suppression / changement de rôle propagés en <= 30 s.
 *
 * On vérifie aussi qu'aucune régression sécurité n'est introduite (user absent
 * → redirect, non-admin sur /admin → redirect, ban → redirect).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetToken = vi.fn();
vi.mock('next-auth/jwt', () => ({ __esModule: true, getToken: mockGetToken }));

const findUnique = vi.fn();
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => ({ user: { findUnique } }) }));

// Aucune preview dans ces tests : on neutralise le module.
vi.mock('@/lib/site-theme-preview', () => ({
  __esModule: true,
  PREVIEW_COOKIE_NAME: 'preview_theme',
  buildPreviewCookieHeader: () => 'preview_theme=x',
  buildPreviewClearCookieHeader: () => 'preview_theme=; Max-Age=0',
  resolvePreviewTheme: () => null,
}));

const { proxy, _resetProxyUserCache } = await import('../proxy');

const USER = 'user-1';
function req(path = '/discover'): NextRequest {
  return new NextRequest(`http://localhost${path}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  _resetProxyUserCache();
  mockGetToken.mockResolvedValue({ id: USER });
  findUnique.mockResolvedValue({ id: USER, isBanned: false, role: 'USER' });
});

describe('proxy — cache court du contrôle user (#146)', () => {
  it('deux navigations protégées = un seul findUnique (cache hit)', async () => {
    await proxy(req());
    await proxy(req('/matches'));
    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  it('après expiration du TTL (30 s), refait le findUnique', async () => {
    vi.useFakeTimers();
    try {
      await proxy(req());
      vi.advanceTimersByTime(31_000);
      await proxy(req());
      expect(findUnique).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('bannissement propagé en <= 30 s : autorisé pendant le TTL, bloqué après', async () => {
    vi.useFakeTimers();
    try {
      const r1 = await proxy(req());
      expect(r1.status).toBe(200); // NextResponse.next()

      // L'utilisateur est banni en base APRÈS la mise en cache.
      findUnique.mockResolvedValue({ id: USER, isBanned: true, role: 'USER' });

      // Toujours dans le TTL : valeur cachée (non banni) → encore autorisé.
      vi.advanceTimersByTime(10_000);
      const r2 = await proxy(req());
      expect(r2.status).toBe(200);

      // Au-delà du TTL : re-fetch → banni → redirect.
      vi.advanceTimersByTime(21_000);
      const r3 = await proxy(req());
      expect(r3.status).toBe(307);
      expect(r3.headers.get('location')).toContain('error=account_banned');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('proxy — pas de régression sécurité (#146)', () => {
  it('user banni → redirect account_banned', async () => {
    findUnique.mockResolvedValue({ id: USER, isBanned: true, role: 'USER' });
    const r = await proxy(req());
    expect(r.status).toBe(307);
    expect(r.headers.get('location')).toContain('error=account_banned');
  });

  it('user introuvable en base → redirect session_expiree', async () => {
    findUnique.mockResolvedValue(null);
    const r = await proxy(req());
    expect(r.headers.get('location')).toContain('error=session_expiree');
  });

  it('non-admin sur /admin → redirect vers /', async () => {
    findUnique.mockResolvedValue({ id: USER, isBanned: false, role: 'USER' });
    const r = await proxy(req('/admin'));
    expect(r.status).toBe(307);
    expect(new URL(r.headers.get('location') as string).pathname).toBe('/');
  });

  it('token absent → redirect session_expiree sans toucher la DB', async () => {
    mockGetToken.mockResolvedValue(null);
    const r = await proxy(req());
    expect(r.headers.get('location')).toContain('error=session_expiree');
    expect(findUnique).not.toHaveBeenCalled();
  });
});
