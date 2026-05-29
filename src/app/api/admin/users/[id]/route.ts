import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { adminBanSchema } from '@/lib/validators';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  const { id } = await params;

  const user = await getDb().user.findUnique({
    where: { id },
    include: {
      profile: true,
      reportsReceived: { where: { status: 'pending' }, take: 10, orderBy: { createdAt: 'desc' } },
      verificationRequests: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  const { id } = await params;

  const body = await request.json();
  const parsed = adminBanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation échouée', details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { banned, reason } = parsed.data;

  const user = await getDb().user.update({
    where: { id },
    data: { isBanned: banned },
  });

  await getDb().moderationLog.create({
    data: {
      adminId: adminResult.userId,
      targetUserId: id,
      action: banned ? 'BAN' : 'UNBAN',
      reason: reason ?? null,
    },
  });

  return NextResponse.json({ user: { id: user.id, isBanned: user.isBanned } });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  const { id } = await params;

  await getDb().user.delete({ where: { id } });

  await getDb().moderationLog.create({
    data: {
      adminId: adminResult.userId,
      targetUserId: id,
      action: 'DELETE_USER',
      reason: 'Admin deletion',
    },
  });

  return NextResponse.json({ success: true });
}