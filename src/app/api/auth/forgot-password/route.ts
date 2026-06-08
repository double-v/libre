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

export async function POST(request: Request) {
  // Rate limit by IP: 5 attempts per minute. Protects against flood
  // of password-reset emails (each one costs us a Resend API call).
  const ip = getClientIp(request);
  const rl = rateLimit(`auth:forgot:${ip}`, limits.auth.limit, limits.auth.windowMs);
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

    await getDb().passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    await sendPasswordResetEmail(user.email, resetUrl);

    return NextResponse.json({ message: okMessage }, { status: 200 });
  } catch (error) {
    console.error('Forgot-password error:', error);
    return NextResponse.json({ error: 'Erreur lors de l\'envoi, veuillez réessayer' }, { status: 500 });
  }
}
