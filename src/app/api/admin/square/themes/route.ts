import { NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';

export async function GET() {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  const [themes, schedule] = await Promise.all([
    getDb().squareThemeConfig.findMany({ orderBy: { themeId: 'asc' } }),
    getDb().squareThemeSchedule.findMany({
      include: { themeConfig: true },
      orderBy: { dayOfWeek: 'asc' },
    }),
  ]);

  return NextResponse.json({ themes, schedule });
}