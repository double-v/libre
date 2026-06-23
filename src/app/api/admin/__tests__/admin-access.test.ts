/**
 * Audit issue #155 — Admin API route access control tests.
 *
 * Verifies that non-admin users are blocked from admin API routes and
 * that admin users get through. Covers three canonical routes that use
 * the shared requireAdmin()/isAdminSession() pattern (which return 404
 * to hide the existence of admin routes) plus the site-config route that
 * uses an inline session.user.role !== 'ADMIN' check (which returns 403).
 *
 * The 404-vs-403 difference is intentional and documented in
 * src/lib/admin.ts: requireAdmin() returns 404 (not 403) to avoid
 * leaking that admin routes exist. site-config predates the helper and
 * uses 403 — both correctly block non-admins.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// === Mocks ===

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({
  __esModule: true,
  default: vi.fn(),
  getServerSession: mockGetServerSession,
}));

const fakeDb = {
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  report: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  verificationRequest: {
    count: vi.fn(),
  },
  moderationLog: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  siteConfig: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
};
vi.mock('@/lib/db', () => ({
  __esModule: true,
  getDb: () => fakeDb,
}));

vi.mock('@/lib/site-themes', () => ({
  __esModule: true,
  isValidSiteTheme: (id: unknown) => id === 'default' || id === 'c-warm',
}));

// Imports after the mocks — routes pull requireAdmin() which calls
// getServerSession + getDb(), both mocked above.
const { GET: getStats } = await import('@/app/api/admin/stats/route');
const { GET: getLogs } = await import('@/app/api/admin/logs/route');
const { GET: getReports } = await import('@/app/api/admin/reports/route');
const { GET: getSiteConfig, PUT: putSiteConfig } = await import(
  '@/app/api/admin/site-config/route'
);

// --- Session helpers ---

function adminSession() {
  mockGetServerSession.mockResolvedValue({
    user: { id: 'admin-1', email: 'admin@x.fr', role: 'ADMIN' },
  });
  // requireAdmin() re-checks the DB — must return ADMIN too.
  fakeDb.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
}

function nonAdminSession() {
  mockGetServerSession.mockResolvedValue({
    user: { id: 'user-1', email: 'u@x.fr', role: 'USER' },
  });
  fakeDb.user.findUnique.mockResolvedValue({ role: 'USER' });
}

function noSession() {
  mockGetServerSession.mockResolvedValue(null);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------
// Canonical routes (requireAdmin + isAdminSession) — return 404 to hide
// the existence of the route from non-admins.
// ---------------------------------------------------------------------

describe('Admin access control — canonical requireAdmin() routes', () => {
  const routes = [
    {
      name: 'GET /api/admin/stats',
      run: () => getStats(),
    },
    {
      name: 'GET /api/admin/logs',
      run: () =>
        getLogs(
          new NextRequest('http://x/api/admin/logs?page=1&perPage=20'),
        ),
    },
    {
      name: 'GET /api/admin/reports',
      run: () =>
        getReports(
          new NextRequest('http://x/api/admin/reports?page=1&perPage=20'),
        ),
    },
  ];

  for (const route of routes) {
    describe(route.name, () => {
      it('blocks non-admin users (404 — hides route existence)', async () => {
        nonAdminSession();
        const res = await route.run();
        expect(res.status).toBe(404);
      });

      it('blocks unauthenticated requests (404)', async () => {
        noSession();
        const res = await route.run();
        expect(res.status).toBe(404);
      });

      it('allows admin users (200)', async () => {
        adminSession();
        // Provide harmless mock returns so the handler completes 200.
        fakeDb.user.count.mockResolvedValue(0);
        fakeDb.report.count.mockResolvedValue(0);
        fakeDb.verificationRequest.count.mockResolvedValue(0);
        fakeDb.moderationLog.findMany.mockResolvedValue([]);
        fakeDb.moderationLog.count.mockResolvedValue(0);
        fakeDb.report.findMany.mockResolvedValue([]);

        const res = await route.run();
        expect(res.status).toBe(200);
      });
    });
  }
});

// ---------------------------------------------------------------------
// site-config now uses the shared requireAdmin() helper (migrated from
// an inline JWT-only 403 check during the #155 audit). Verify it blocks
// non-admins with the canonical 404 and allows admins with 200.
// ---------------------------------------------------------------------

describe('Admin access control — site-config (migrated to requireAdmin)', () => {
  it('GET blocks non-admin users (404 — hides route existence)', async () => {
    nonAdminSession();
    const res = await getSiteConfig();
    expect(res.status).toBe(404);
  });

  it('GET blocks unauthenticated requests (404)', async () => {
    noSession();
    const res = await getSiteConfig();
    expect(res.status).toBe(404);
  });

  it('GET allows admin users (200)', async () => {
    adminSession();
    fakeDb.siteConfig.findUnique.mockResolvedValue({ currentTheme: 'default' });
    const res = await getSiteConfig();
    expect(res.status).toBe(200);
  });

  it('PUT blocks non-admin users (404)', async () => {
    nonAdminSession();
    const res = await putSiteConfig(
      new NextRequest('http://x/api/admin/site-config', {
        method: 'PUT',
        body: JSON.stringify({ currentTheme: 'default' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(404);
  });

  it('PUT allows admin users (200)', async () => {
    adminSession();
    fakeDb.siteConfig.upsert.mockResolvedValue({ currentTheme: 'default' });
    const res = await putSiteConfig(
      new NextRequest('http://x/api/admin/site-config', {
        method: 'PUT',
        body: JSON.stringify({ currentTheme: 'default' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(res.status).toBe(200);
  });
});