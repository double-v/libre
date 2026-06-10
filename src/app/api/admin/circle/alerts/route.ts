import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';

const ALLOWED_STATUSES = ['queued', 'sent', 'failed', 'handled'] as const;
type AlertStatus = (typeof ALLOWED_STATUSES)[number];
const DEFAULT_STATUS: AlertStatus = 'sent';
const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 50;
const MIN_PER_PAGE = 1;

export async function GET(request: NextRequest) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  const { searchParams } = request.nextUrl;
  const statusParam = searchParams.get('status');
  const status: AlertStatus = ALLOWED_STATUSES.includes(statusParam as AlertStatus)
    ? (statusParam as AlertStatus)
    : DEFAULT_STATUS;
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const perPageRaw = Number(searchParams.get('perPage') ?? String(DEFAULT_PER_PAGE));
  const perPage = Math.min(
    MAX_PER_PAGE,
    Math.max(MIN_PER_PAGE, Number.isFinite(perPageRaw) ? perPageRaw : DEFAULT_PER_PAGE),
  );

  const where = { deliveryStatus: status };
  const [alertRows, total] = await Promise.all([
    getDb().checkinAlert.findMany({
      where,
      include: {
        checkin: {
          select: {
            id: true,
            userId: true,
            status: true,
            triggeredAt: true,
            expiresAt: true,
            user: { select: { id: true, displayName: true } },
          },
        },
      },
      orderBy: { sentAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    getDb().checkinAlert.count({ where }),
  ]);

  // contactId is a plain UUID column with no Prisma relation, so we
  // resolve the contact display names with a single follow-up query.
  const contactIds = Array.from(new Set(alertRows.map((a) => a.contactId)));
  const contactUsers = contactIds.length
    ? await getDb().user.findMany({
        where: { id: { in: contactIds } },
        select: { id: true, displayName: true },
      })
    : [];
  const contactById = new Map(contactUsers.map((u) => [u.id, u]));

  const alerts = alertRows.map((a) => ({
    ...a,
    contact: contactById.get(a.contactId) ?? { id: a.contactId, displayName: '—' },
  }));

  return NextResponse.json({ alerts, total, page, perPage });
}
