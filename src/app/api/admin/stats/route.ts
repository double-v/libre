import { NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { prisma } from '@/lib/db';

export async function GET() {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  const [
    totalUsers,
    bannedUsers,
    pendingReports,
    pendingVerifications,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isBanned: true } }),
    prisma.report.count({ where: { status: 'pending' } }),
    prisma.verificationRequest.count({ where: { status: 'pending' } }),
  ]);

  return NextResponse.json({
    totalUsers,
    bannedUsers,
    pendingReports,
    pendingVerifications,
  });
}