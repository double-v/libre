import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { rateLimit, limits } from '@/lib/rate-limit';
import { squareReportSchema } from '@/lib/square/validators';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const { id: messageId } = await params;

  // Rate limit: 3 reports per hour
  const rl = await rateLimit(`square:report:${userId}`, limits.squareReport.limit, limits.squareReport.windowMs);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Trop de signalements. Réessayez plus tard.' },
      { status: 429 },
    );
  }

  const body = await request.json();
  const parsed = squareReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Raison invalide' }, { status: 400 });
  }

  const { reason } = parsed.data;

  // Check message exists
  const message = await getDb().squareMessage.findUnique({ where: { id: messageId } });
  if (!message) {
    return NextResponse.json({ error: 'Message non trouvé' }, { status: 404 });
  }

  // Check for duplicate report
  const existing = await getDb().squareMessageReport.findFirst({
    where: { messageId, reporterId: userId },
  });
  if (existing) {
    return NextResponse.json(
      { error: 'Vous avez déjà signalé ce message' },
      { status: 409 },
    );
  }

  const report = await getDb().squareMessageReport.create({
    data: {
      messageId,
      reporterId: userId,
      reason,
    },
  });

  return NextResponse.json({ report }, { status: 201 });
}