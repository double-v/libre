import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';

// ---------------------------------------------------------------------------
// POST /api/moderation/verify/vu — le membre a vu la décision (spec 012, FR-010).
//
// Éteint le repère de la roue dentée. Idempotent : seules les décisions pas
// encore vues de ce membre (session seule, FR-S06) sont marquées.
// ---------------------------------------------------------------------------
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  await getDb().verificationRequest.updateMany({
    where: { userId: session.user.id, status: { in: ['approved', 'rejected'] }, vueAt: null },
    data: { vueAt: new Date() },
  });
  return new NextResponse(null, { status: 204 });
}
