import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { prisma } from '@/lib/db';
import { adminHandleVerificationSchema } from '@/lib/validators';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  const { id } = await params;

  const body = await request.json();
  const parsed = adminHandleVerificationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation échouée' }, { status: 400 });
  }

  const { action, reason } = parsed.data;
  const verification = await prisma.verificationRequest.findUnique({ where: { id } });
  if (!verification) {
    return NextResponse.json({ error: 'Demande non trouvée' }, { status: 404 });
  }

  const isApproved = action === 'APPROVE_VERIFICATION';

  await prisma.verificationRequest.update({
    where: { id },
    data: {
      status: isApproved ? 'approved' : 'rejected',
      reviewedBy: adminResult.userId,
      resolvedAt: new Date(),
    },
  });

  if (isApproved) {
    await prisma.user.update({
      where: { id: verification.userId },
      data: { isVerified: true },
    });
  }

  await prisma.moderationLog.create({
    data: {
      adminId: adminResult.userId,
      targetUserId: verification.userId,
      action,
      reason: reason ?? null,
    },
  });

  return NextResponse.json({ success: true, approved: isApproved });
}