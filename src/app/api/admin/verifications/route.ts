import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status') ?? 'pending';

  const verifications = await getDb().verificationRequest.findMany({
    where: { status },
    include: {
      user: { select: { id: true, displayName: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ verifications });
}