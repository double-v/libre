import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock next-auth/jwt BEFORE importing proxy
vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn(),
}));

// Mock the DB layer so the proxy doesn't try to hit a real DB
vi.mock('@/lib/db', () => ({
  getDb: vi.fn(() => ({
    user: {
      findUnique: vi.fn().mockResolvedValue({ id: 'user-1', isBanned: false }),
    },
  })),
}));

// Mock the preview theme helpers (proxy uses them on every request)
vi.mock('@/lib/site-theme-preview', () => ({
  PREVIEW_COOKIE_NAME: 'site-theme-preview',
  buildPreviewCookieHeader: vi.fn().mockReturnValue('site-theme-preview=; Path=/'),
  buildPreviewClearCookieHeader: vi.fn().mockReturnValue('site-theme-preview=; Path=/; Max-Age=0'),
  resolvePreviewTheme: vi.fn().mockReturnValue(null),
}));

import { proxy } from '@/proxy';
import { getToken } from 'next-auth/jwt';

const mockGetToken = vi.mocked(getToken);

function makeRequest(pathname: string, cookies: Record<string, string> = {}): NextRequest {
  const url = `https://example.com${pathname}`;
  const req = new NextRequest(url);
  for (const [name, value] of Object.entries(cookies)) {
    req.cookies.set(name, value);
  }
  return req;
}

describe('proxy auth loop fix (#17)', () => {
  beforeEach(() => {
    mockGetToken.mockReset();
  });

  it('redirects to /login when there is no token', async () => {
    mockGetToken.mockResolvedValue(null);
    const req = makeRequest('/discover', {
      'next-auth.session-token': 'stale-jwt-value',
    });
    const res = await proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
    expect(res.headers.get('location')).toContain('error=session_expiree');
  });

  it('clears the next-auth.session-token cookie when no token (the loop fix)', async () => {
    mockGetToken.mockResolvedValue(null);
    const req = makeRequest('/discover', {
      'next-auth.session-token': 'stale-jwt-value',
    });
    const res = await proxy(req);
    // The Set-Cookie header should clear the session cookie (Max-Age=0 or empty value)
    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie).toMatch(/next-auth\.session-token=/);
    // If the cookie is being cleared, the value should be empty or the max-age should be 0
    const isCleared =
      setCookie.includes('Max-Age=0') ||
      setCookie.match(/next-auth\.session-token=;/);
    expect(isCleared).toBeTruthy();
  });

  it('clears the __Secure-next-auth.session-token cookie too (HTTPS case)', async () => {
    mockGetToken.mockResolvedValue(null);
    const req = makeRequest('/discover', {
      '__Secure-next-auth.session-token': 'stale-secure-jwt',
    });
    const res = await proxy(req);
    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie).toMatch(/__Secure-next-auth\.session-token=/);
  });

  it('does NOT redirect for unprotected paths even with a stale cookie', async () => {
    mockGetToken.mockResolvedValue(null);
    const req = makeRequest('/manifesto', {
      'next-auth.session-token': 'stale-jwt-value',
    });
    const res = await proxy(req);
    // NextResponse.next() returns a 200 with the original URL preserved
    expect(res.status).toBe(200);
  });

  it('does NOT redirect for /api/* routes', async () => {
    mockGetToken.mockResolvedValue(null);
    const req = makeRequest('/api/some-endpoint', {
      'next-auth.session-token': 'stale-jwt-value',
    });
    const res = await proxy(req);
    expect(res.status).toBe(200);
  });
});
