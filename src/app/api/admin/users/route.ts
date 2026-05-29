import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const perPage = Math.min(50, Math.max(1, Number(searchParams.get('perPage') ?? '20')));
  const search = searchParams.get('search') ?? '';

  const where = search
    ? {
        OR: [
          { displayName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    getDb().user.findMany({
      where,
      select: {
        id: true,
        displayName: true,
        email: true,
        role: true,
        isBanned: true,
        isVerified: true,
        createdAt: true,
        lastActive: true,
        profile: { select: { photos: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    getDb().user.count({ where }),
  ]);

  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      photoCount: (u.profile?.photos as string[] | undefined)?.length ?? 0,
      profile: undefined,
    })),
    total,
    page,
    perPage,
  });
}