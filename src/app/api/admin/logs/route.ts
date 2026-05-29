import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const perPage = Math.min(100, Math.max(1, Number(searchParams.get('perPage') ?? '20')));

  const [logs, total] = await Promise.all([
    prisma.moderationLog.findMany({
      include: {
        admin: { select: { id: true, displayName: true } },
        targetUser: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.moderationLog.count(),
  ]);

  return NextResponse.json({ logs, total, page, perPage });
}