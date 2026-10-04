import { NextRequest, NextResponse, after } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { adminReplyFeedbackSchema } from '@/lib/validators';
import { buildPayload, sendPushToUser } from '@/lib/push/server';
import { sendFeedbackReplyEmail } from '@/lib/email-send';
import { MES_RETOURS_HREF } from '@/lib/feedback-reply';

/**
 * POST /api/admin/feedback/[id]/reply — répondre à un retour (#477).
 *
 * Une seule réponse, jamais réécrite : l'écriture est conditionnée à
 * `reply: null`, si bien que deux admins qui répondent en même temps ne
 * s'écrasent pas — le second reçoit 409. Le retour passe en « replied ».
 *
 * L'auteur est prévenu après la réponse HTTP (push s'il l'a activé, e-mail
 * toujours), sans le texte : il lit la réponse dans l'app. Ces envois sont
 * best-effort et ne changent jamais le statut renvoyé à l'admin.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = adminReplyFeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'La réponse doit faire entre 1 et 2000 caractères.' }, { status: 400 });
  }

  const db = getDb();
  const existing = await db.feedback.findUnique({
    where: { id },
    select: { id: true, userId: true, reply: true, user: { select: { email: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Retour non trouvé' }, { status: 404 });
  }
  if (!existing.userId) {
    return NextResponse.json({ error: 'Retour anonyme : impossible de répondre.' }, { status: 422 });
  }
  if (existing.reply !== null) {
    return NextResponse.json({ error: 'Ce retour a déjà une réponse.' }, { status: 409 });
  }

  const now = new Date();
  const { count } = await db.feedback.updateMany({
    where: { id, reply: null },
    data: { reply: parsed.data.reply, repliedAt: now, repliedBy: adminResult.userId, status: 'replied' },
  });
  if (count === 0) {
    return NextResponse.json({ error: 'Ce retour a déjà une réponse.' }, { status: 409 });
  }

  const authorId = existing.userId;
  const email = existing.user?.email;
  after(async () => {
    await sendPushToUser(authorId, buildPayload('feedback-reply', {})).catch(() => {});
    if (email) {
      const url = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}${MES_RETOURS_HREF}`;
      await sendFeedbackReplyEmail(email, url).catch(() => {});
    }
  });

  return NextResponse.json({ feedback: { id, status: 'replied', reply: parsed.data.reply, repliedAt: now.toISOString() } });
}
