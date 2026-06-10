/**
 * Tests d'intégration — Admin API for Check-in alerts (chantier 01, tâche 4.1).
 *
 * Mocks: next-auth (admin session) + @/lib/db (Prisma).
 * Pattern borrowed from src/app/api/circle/contacts/__tests__/route.test.ts.
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
    findMany: vi.fn().mockResolvedValue([]),
  },
  checkinAlert: {
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  safetyCheckin: {
    findUnique: vi.fn(),
  },
  moderationLog: {
    create: vi.fn(),
  },
};
vi.mock('@/lib/db', () => ({
  getDb: () => fakeDb,
}));

// Helper: build a fake admin session in.
function adminSession() {
  mockGetServerSession.mockResolvedValue({
    user: { id: 'admin-1', email: 'admin@x.fr', role: 'ADMIN' },
  });
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

// Imports après les mocks
const { GET } = await import('@/app/api/admin/circle/alerts/route');
const { PATCH } = await import('@/app/api/admin/circle/alerts/[id]/route');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/admin/circle/alerts', () => {
  it('returns 404 when there is no session (hides route existence)', async () => {
    noSession();
    const res = await GET(new NextRequest('http://x/api/admin/circle/alerts'));
    expect(res.status).toBe(404);
  });

  it('returns 404 when the session is not admin', async () => {
    nonAdminSession();
    const res = await GET(new NextRequest('http://x/api/admin/circle/alerts'));
    expect(res.status).toBe(404);
  });

  it('returns a paginated list of alerts with related user/checkin info', async () => {
    adminSession();
    fakeDb.checkinAlert.findMany.mockResolvedValue([
      {
        id: 'alert-1',
        checkinId: 'checkin-1',
        contactId: 'contact-1',
        deliveryStatus: 'sent',
        sentAt: new Date('2026-06-10T10:00:00Z'),
        checkin: {
          id: 'checkin-1',
          userId: 'user-1',
          status: 'expired',
          triggeredAt: new Date('2026-06-09T18:00:00Z'),
          expiresAt: new Date('2026-06-10T09:00:00Z'),
          user: { id: 'user-1', displayName: 'Alice' },
        },
      },
    ]);
    fakeDb.checkinAlert.count.mockResolvedValue(1);
    fakeDb.user.findMany.mockResolvedValue([{ id: 'contact-1', displayName: 'Bob' }]);

    const res = await GET(new NextRequest('http://x/api/admin/circle/alerts?status=sent&page=1&perPage=20'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alerts).toHaveLength(1);
    expect(body.alerts[0].checkin.user.displayName).toBe('Alice');
    expect(body.alerts[0].contact.displayName).toBe('Bob');
    expect(body.total).toBe(1);
  });

  it('defaults to status=sent when no status param is provided', async () => {
    adminSession();
    fakeDb.checkinAlert.findMany.mockResolvedValue([]);
    fakeDb.checkinAlert.count.mockResolvedValue(0);

    await GET(new NextRequest('http://x/api/admin/circle/alerts'));
    const whereArg = fakeDb.checkinAlert.findMany.mock.calls[0][0].where;
    expect(whereArg.deliveryStatus).toBe('sent');
  });

  it('accepts a known status filter (queued, sent, failed, handled)', async () => {
    adminSession();
    fakeDb.checkinAlert.findMany.mockResolvedValue([]);
    fakeDb.checkinAlert.count.mockResolvedValue(0);

    await GET(new NextRequest('http://x/api/admin/circle/alerts?status=handled'));
    const whereArg = fakeDb.checkinAlert.findMany.mock.calls[0][0].where;
    expect(whereArg.deliveryStatus).toBe('handled');
  });

  it('clamps perPage to [1, 50]', async () => {
    adminSession();
    fakeDb.checkinAlert.findMany.mockResolvedValue([]);
    fakeDb.checkinAlert.count.mockResolvedValue(0);

    await GET(new NextRequest('http://x/api/admin/circle/alerts?perPage=999'));
    expect(fakeDb.checkinAlert.findMany.mock.calls[0][0].take).toBe(50);

    await GET(new NextRequest('http://x/api/admin/circle/alerts?perPage=0'));
    expect(fakeDb.checkinAlert.findMany.mock.calls[1][0].take).toBe(1);
  });
});

describe('PATCH /api/admin/circle/alerts/[id]', () => {
  it('returns 404 for non-admin', async () => {
    nonAdminSession();
    const res = await PATCH(
      new NextRequest('http://x/api/admin/circle/alerts/alert-1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'HANDLE' }),
      }),
      { params: Promise.resolve({ id: 'alert-1' }) } as never,
    );
    expect(res.status).toBe(404);
  });

  it('returns 404 if the alert does not exist', async () => {
    adminSession();
    fakeDb.checkinAlert.findUnique.mockResolvedValue(null);
    const res = await PATCH(
      new NextRequest('http://x/api/admin/circle/alerts/missing', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'HANDLE' }),
      }),
      { params: Promise.resolve({ id: 'missing' }) } as never,
    );
    expect(res.status).toBe(404);
  });

  it('returns 400 on invalid action', async () => {
    adminSession();
    fakeDb.checkinAlert.findUnique.mockResolvedValue({ id: 'a1', checkin: { userId: 'u1' } });
    const res = await PATCH(
      new NextRequest('http://x/api/admin/circle/alerts/a1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'BOGUS' }),
      }),
      { params: Promise.resolve({ id: 'a1' }) } as never,
    );
    expect(res.status).toBe(400);
  });

  it('marks the alert handled, logs moderation, returns 200', async () => {
    adminSession();
    fakeDb.checkinAlert.findUnique.mockResolvedValue({ id: 'a1', checkin: { userId: 'u1' } });
    fakeDb.checkinAlert.update.mockResolvedValue({ id: 'a1', deliveryStatus: 'handled' });
    fakeDb.moderationLog.create.mockResolvedValue({ id: 'log-1' });

    const res = await PATCH(
      new NextRequest('http://x/api/admin/circle/alerts/a1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'HANDLE' }),
      }),
      { params: Promise.resolve({ id: 'a1' }) } as never,
    );
    expect(res.status).toBe(200);
    expect(fakeDb.checkinAlert.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { deliveryStatus: 'handled' },
    });
    expect(fakeDb.moderationLog.create).toHaveBeenCalledWith({
      data: {
        adminId: 'admin-1',
        targetUserId: 'u1',
        action: 'HANDLE_CHECKIN_ALERT',
        reason: null,
      },
    });
  });
});
