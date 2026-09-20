import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { masquerEmail } from '@/lib/masquer-email';

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

  // Même minimisation que la liste des membres (#423) : la file de
  // vérification est une liste, l'adresse entière n'y a pas sa place.
  return NextResponse.json({
    verifications: verifications.map(({ user: { email, ...user }, ...v }) => ({
      ...v,
      user: { ...user, emailMasque: masquerEmail(email) },
    })),
  });
}