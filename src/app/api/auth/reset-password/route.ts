import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { verifyResetToken } from '@/lib/reset-token';
import { normalizeEmail } from '@/lib/email';
import { registerSchema } from '@/lib/validators';
import { hashToken } from '@/lib/token-hash';
import { rateLimit, limits } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/client-ip';

export async function POST(request: Request) {
  // Rate limit by IP: 5 attempts per minute. Protects against
  // enumeration of valid reset tokens.
  const ip = getClientIp(request);
  const rl = await rateLimit(`auth:reset:${ip}`, limits.auth.limit, limits.auth.windowMs);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans une minute.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json({ error: 'Token et mot de passe requis' }, { status: 400 });
    }

    const parsed = registerSchema.shape.password.safeParse(password);
    if (!parsed.success) {
      return NextResponse.json({ error: '8 caractères min, avec majuscule, minuscule et chiffre' }, { status: 400 });
    }

    // Verify JWT signature and expiry
    const payload = await verifyResetToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Le lien de réinitialisation est invalide ou a expiré.' }, { status: 400 });
    }

    // Look up the token hash in the database
    const tokenHash = hashToken(token);
    const dbToken = await getDb().passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!dbToken || dbToken.usedAt || dbToken.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Le lien de réinitialisation est invalide ou a expiré.' }, { status: 400 });
    }

    // Verify user still exists and has a password
    const user = await getDb().user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 });
    }

    // Verify email hasn't changed since token was issued
    if (user.normalizedEmail !== normalizeEmail(payload.email)) {
      return NextResponse.json({ error: 'Le lien de réinitialisation est invalide.' }, { status: 400 });
    }

    // Hash new password and update user
    const passwordHash = await bcrypt.hash(password, 12);
    await getDb().$transaction([
      getDb().user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      getDb().passwordResetToken.update({
        where: { id: dbToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ message: 'Mot de passe mis à jour.' }, { status: 200 });
  } catch (error) {
    console.error('Reset-password error:', error);
    return NextResponse.json({ error: 'Une erreur est survenue, veuillez réessayer.' }, { status: 500 });
  }
}
