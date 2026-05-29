import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { adminHandleReportSchema } from '@/lib/validators';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  const { id } = await params;

  const body = await request.json();
  const parsed = adminHandleReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation échouée' }, { status: 400 });
  }

  const { action, reason } = parsed.data;
  const report = await getDb().report.findUnique({ where: { id } });
  if (!report) {
    return NextResponse.json({ error: 'Signalement non trouvé' }, { status: 404 });
  }

  const statusMap: Record<string, string> = {
    DISMISS_REPORT: 'dismissed',
    BAN: 'resolved',
    WARNING: 'resolved',
  };

  await getDb().report.update({
    where: { id },
    data: { status: statusMap[action], reviewedBy: adminResult.userId, resolvedAt: new Date() },
  });

  if (action === 'BAN') {
    await getDb().user.update({
      where: { id: report.reportedId },
      data: { isBanned: true },
    });
  }

  await getDb().moderationLog.create({
    data: {
      adminId: adminResult.userId,
      targetUserId: report.reportedId,
      action,
      reason: reason ?? null,
    },
  });

  return NextResponse.json({ success: true });
}