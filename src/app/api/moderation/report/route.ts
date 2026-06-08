import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { reportSchema } from '@/lib/validators';
import { rateLimit, limits } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = rateLimit(`report:${session.user.id}`, limits.report.limit, limits.report.windowMs);
    if (!rl.success) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = reportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { reportedId, reason, description } = parsed.data;
    const reporterId = session.user.id;

    const report = await getDb().report.create({
      data: {
        reporterId,
        reportedId,
        reason,
        description,
        status: 'pending',
      },
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    console.error('Report creation error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}