import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { rateLimit, limits } from '@/lib/rate-limit';
import { ANSWER_MESSAGES, answersFor, estLaReponseRetiree, validateAnswer } from '@/lib/answers';

/**
 * Mes réponses aux questions de profil (spec 009, US1). Une réponse par
 * question, sans limite de nombre ; la banque vit dans le code. Seuls `key`,
 * `choices` et `text` du corps sont lus : l'autrice vient de la session, le
 * statut est remis à « publiée » à chaque écriture (réécrire une réponse
 * retirée par la modération la republie, validée comme une neuve).
 */

const SELECT = { id: true, questionKey: true, choices: true, text: true, status: true } as const;

async function sessionUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

async function limite(userId: string): Promise<NextResponse | null> {
  const rl = await rateLimit(`answers:${userId}`, limits.answers.limit, limits.answers.windowMs);
  return rl.success
    ? null
    : NextResponse.json({ error: 'Tu as enregistré beaucoup de réponses d’un coup. Réessaie dans un moment.' }, { status: 429 });
}

export async function GET() {
  try {
    const userId = await sessionUserId();
    if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const answers = await getDb().profileAnswer.findMany({ where: { userId }, select: SELECT });
    return NextResponse.json({ answers: answersFor({ isSelf: true, viewerKeys: undefined, answers }) });
  } catch (error) {
    console.error('Answers fetch error:', error);
    return NextResponse.json({ error: 'Une erreur est survenue, réessaie' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await sessionUserId();
    if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const refus = await limite(userId);
    if (refus) return refus;

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const key = typeof body.key === 'string' ? body.key : '';
    const verdict = validateAnswer(key, { choices: body.choices, text: body.text });
    if (!verdict.ok) return NextResponse.json({ error: verdict.message, motif: verdict.motif }, { status: 400 });

    const { choices, text } = verdict.value;

    // Une réponse retirée par la modération ne revient pas à l'identique
    // (revue PR #466) ; une réponse différente est republiée, et l'admin voit
    // dans le signalement qu'elle a été réécrite après un retrait.
    const existante = await getDb().profileAnswer.findUnique({
      where: { userId_questionKey: { userId, questionKey: key } },
      select: { status: true, removedText: true, removedChoices: true, removedAt: true },
    });
    if (estLaReponseRetiree({ choices, text }, existante)) {
      return NextResponse.json(
        { error: ANSWER_MESSAGES['identique-retiree'], motif: 'identique-retiree' },
        { status: 400 },
      );
    }
    if (existante?.status === 'removed') console.info('answers.rewrite_after_removal');

    const saved = await getDb().profileAnswer.upsert({
      where: { userId_questionKey: { userId, questionKey: key } },
      create: { userId, questionKey: key, choices, text },
      update: { choices, text, status: 'published' },
      select: SELECT,
    });
    return NextResponse.json({ answer: answersFor({ isSelf: true, viewerKeys: undefined, answers: [saved] })[0] });
  } catch (error) {
    console.error('Answer save error:', error);
    return NextResponse.json({ error: 'Une erreur est survenue, réessaie' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await sessionUserId();
    if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const refus = await limite(userId);
    if (refus) return refus;
    const key = new URL(request.url).searchParams.get('key') ?? '';
    await getDb().profileAnswer.deleteMany({ where: { userId, questionKey: key } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Answer delete error:', error);
    return NextResponse.json({ error: 'Une erreur est survenue, réessaie' }, { status: 500 });
  }
}
