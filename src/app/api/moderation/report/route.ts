import { NextResponse, after } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { reportSchema } from '@/lib/validators';
import { sendPushToAdmins, buildPayload } from '@/lib/push/server';
import { rateLimit, limits } from '@/lib/rate-limit';
import { enregistrerSignal } from '@/lib/fraude/signaux';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = await rateLimit(`report:${session.user.id}`, limits.report.limit, limits.report.windowMs);
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

    // Réponses aux questions du profil signalé, copiées maintenant (spec 009,
    // revue PR #466) : la personne signalée ne peut plus effacer la preuve.
    // Best-effort : un échec de lecture n'empêche jamais de signaler.
    const answersSnapshot = await Promise.resolve()
      .then(() =>
        getDb().profileAnswer.findMany({
          where: { userId: reportedId, status: 'published' },
          select: { questionKey: true, choices: true, text: true },
        }),
      )
      .catch(() => null);

    const report = await getDb().report.create({
      data: {
        reporterId,
        reportedId,
        reason,
        description,
        status: 'pending',
        ...(answersSnapshot ? { answersSnapshot } : {}),
      },
    });

    // « Faux profil » alimente la file « Profils à vérifier » (spec 006) : un
    // signal par signalement, jamais bloquant pour la personne qui signale.
    if (reason === 'fake') {
      await enregistrerSignal({ userId: reportedId, type: 'signalement_faux', force: 'fort', cle: report.id });
    }

    // #393 : prévenir les admins hors de l'app, après la réponse. Charge utile
    // sans motif ni identité (SC-006) — « quelque chose attend », c'est tout.
    // Best-effort : ne change jamais le statut de la réponse.
    after(() => sendPushToAdmins(buildPayload('admin-report', {})).catch(() => {}));

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    console.error('Report creation error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}