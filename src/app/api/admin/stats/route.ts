import { NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';

export async function GET() {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  const [
    totalUsers,
    bannedUsers,
    pendingReports,
    pendingVerifications,
  ] = await Promise.all([
    getDb().user.count(),
    getDb().user.count({ where: { isBanned: true } }),
    getDb().report.count({ where: { status: 'pending' } }),
    getDb().verificationRequest.count({ where: { status: 'pending' } }),
  ]);

  return NextResponse.json({
    totalUsers,
    bannedUsers,
    pendingReports,
    pendingVerifications,
  });
}