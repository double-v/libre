import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';

const ALLOWED_ACTIONS = ['HANDLE'] as const;
type HandleAction = (typeof ALLOWED_ACTIONS)[number];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const action = (body as { action?: unknown })?.action;
  if (typeof action !== 'string' || !ALLOWED_ACTIONS.includes(action as HandleAction)) {
    return NextResponse.json(
      { error: 'Action invalide', details: { action: ['Must be one of: HANDLE'] } },
      { status: 400 },
    );
  }

  const alert = await getDb().checkinAlert.findUnique({
    where: { id },
    select: { id: true, checkin: { select: { userId: true } } },
  });
  if (!alert) {
    return NextResponse.json({ error: 'Alerte non trouvée' }, { status: 404 });
  }

  await getDb().checkinAlert.update({
    where: { id },
    data: { deliveryStatus: 'handled' },
  });

  await getDb().moderationLog.create({
    data: {
      adminId: adminResult.userId,
      targetUserId: alert.checkin.userId,
      action: 'HANDLE_CHECKIN_ALERT',
      reason: null,
    },
  });

  return NextResponse.json({ success: true });
}
