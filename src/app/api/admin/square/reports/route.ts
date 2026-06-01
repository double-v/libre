import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status') ?? 'pending';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const perPage = Math.min(50, Math.max(1, Number(searchParams.get('perPage') ?? '20')));

  const [reports, total] = await Promise.all([
    getDb().squareMessageReport.findMany({
      where: { status },
      include: {
        message: { select: { id: true, pseudonym: true, content: true, type: true } },
        reporter: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    getDb().squareMessageReport.count({ where: { status } }),
  ]);

  return NextResponse.json({ reports, total, page, perPage });
}