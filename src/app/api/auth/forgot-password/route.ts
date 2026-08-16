import { NextResponse } from 'next/server';
import { createResetToken } from '@/lib/reset-token';
import { sendPasswordResetEmail } from '@/lib/email-send';
import { normalizeEmail } from '@/lib/email';
import { getDb } from '@/lib/db';
import { hashToken } from '@/lib/token-hash';
import { rateLimit, limits } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/client-ip';

const FORGET_LIMIT = 3;
const FORGET_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Trace une demande servie par le message uniforme mais qui n'a envoyé aucun
 * email. Le motif seul suffit à voir la panne dans les logs Vercel, et n'aide
 * pas à énumérer les comptes : il n'y a rien dans la réponse HTTP qui le
 * distingue d'un envoi réussi.
 */
function journaliserSortieSansEnvoi(motif: string): void {
  console.warn(`[forgot-password] demande sans envoi — motif=${motif}`);
}

export async function POST(request: Request) {
  // Rate limit by IP: 5 attempts per minute. Protects against flood
  // of password-reset emails (each one costs us a Resend API call).
  const ip = getClientIp(request);
  const rl = await rateLimit(`auth:forgot:${ip}`, limits.auth.limit, limits.auth.windowMs);
  if (!rl.success) {
    return NextResponse.json(
      { message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' },
      { status: 200, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  try {
    const body = await request.json();
    const email = (body.email as string)?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    // Uniform response — always same message to prevent email enumeration
    const okMessage = 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.';

    const normalizedEmail = normalizeEmail(email);
    const user = await getDb().user.findUnique({ where: { normalizedEmail } });

    if (!user || !user.passwordHash) {
      // OAuth-only users have no password — can't reset it.
      //
      // On répond comme dans le cas nominal (pas d'énumération d'emails) mais
      // on trace le motif : sans ça, une demande qui n'envoie rien est
      // strictement indistinguable d'une demande servie, côté Vercel comme
      // côté Resend — c'est ce qui a laissé #334 invisible des mois. Le motif
      // seul, jamais l'adresse : pas de PII dans les logs (cf. #32).
      journaliserSortieSansEnvoi(user ? 'sans_mot_de_passe' : 'compte_introuvable');
      return NextResponse.json({ message: okMessage }, { status: 200 });
    }

    // DB-based rate-limit: count tokens created for this user in the last hour
    const since = new Date(Date.now() - FORGET_WINDOW_MS);
    const recentCount = await getDb().passwordResetToken.count({
      where: {
        userId: user.id,
        createdAt: { gte: since },
      },
    });

    if (recentCount >= FORGET_LIMIT) {
      journaliserSortieSansEnvoi('quota_horaire');
      return NextResponse.json({ message: okMessage }, { status: 200 });
    }

    // Invalidate any existing unused tokens for this user
    await getDb().passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });

    // Create JWT token and hash it for DB storage
    const token = await createResetToken(user.id, user.email);
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const jeton = await getDb().passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (error) {
      // L'envoi est un effet de bord APRÈS écriture : s'il échoue, la ligne
      // reste en base et compte dans le quota horaire ci-dessus. Trois échecs
      // suffisaient alors à verrouiller le compte une heure — derrière un
      // message de succès, donc sans recours. On retire le jeton pour que
      // l'utilisateur puisse réessayer une fois la panne d'envoi passée.
      await getDb()
        .passwordResetToken.delete({ where: { id: jeton.id } })
        .catch((suppression: unknown) => {
          console.error(
            '[forgot-password] jeton non retiré après échec d\'envoi :',
            suppression instanceof Error ? suppression.message : 'erreur inconnue',
          );
        });
      throw error;
    }

    return NextResponse.json({ message: okMessage }, { status: 200 });
  } catch (error) {
    console.error('Forgot-password error:', error);
    return NextResponse.json({ error: 'Erreur lors de l\'envoi, veuillez réessayer' }, { status: 500 });
  }
}
