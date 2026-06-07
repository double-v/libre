import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { registerSchema } from '@/lib/validators';
import { normalizeEmail } from '@/lib/email';
import { createVerificationToken } from '@/lib/verify-token';
import { verifyTurnstile } from '@/lib/turnstile';
import { sendVerificationEmail } from '@/lib/email-send';
import { rateLimit, limits } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/client-ip';

export async function POST(request: Request) {
  // Rate limit by IP: 5 attempts per minute (see #27). Protects against
  // bot-driven account creation spam.
  const ip = getClientIp(request);
  const rl = rateLimit(`auth:register:${ip}`, limits.auth.limit, limits.auth.windowMs);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans une minute.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      const message = firstError?.message || 'Les informations saisies sont invalides';
      return NextResponse.json(
        { error: message },
        { status: 400 },
      );
    }

    const { email, password, displayName, turnstileToken = undefined, deviceId = undefined, consentGiven = false } = parsed.data as typeof parsed.data & { consentGiven?: boolean };

    // RGPD: verify explicit consent was given
    if (!consentGiven) {
      return NextResponse.json(
        { error: 'Vous devez accepter les CGU et la politique de confidentialité pour vous inscrire' },
        { status: 400 },
      );
    }

    // Verify Turnstile captcha.
    // In production, ALWAYS require Turnstile — even if the env var is
    // missing (verifyTurnstile will throw). In dev AND in Vercel preview
    // deploys (which set NODE_ENV=production but lack a real Turnstile
    // key), allow bypass when the env var is not set, so CI E2E tests
    // can run.
    const isProd = process.env.NODE_ENV === 'production';
    const isVercelPreview = process.env.VERCEL_ENV === 'preview';
    const requireTurnstile = (isProd && !isVercelPreview) || process.env.TURNSTILE_SECRET_KEY;
    if (requireTurnstile) {
      if (!turnstileToken) {
        return NextResponse.json(
          { error: 'Veuillez compléter le captcha' },
          { status: 400 },
        );
      }
      const valid = await verifyTurnstile(turnstileToken);
      if (!valid) {
        return NextResponse.json(
          { error: 'Captcha invalide, veuillez réessayer' },
          { status: 400 },
        );
      }
    }

    // Check device limit
    if (deviceId) {
      const deviceCount = await getDb().user.count({
        where: { deviceId },
      });
      if (deviceCount >= 2) {
        return NextResponse.json(
          { error: 'Impossible de créer un compte pour le moment' },
          { status: 403 },
        );
      }
    }

    const normalizedEmail = normalizeEmail(email);

    const existingUser = await getDb().user.findUnique({ where: { normalizedEmail } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Impossible de créer un compte avec cet email' },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await getDb().user.create({
      data: {
        email: email.toLowerCase().trim(),
        normalizedEmail,
        displayName: displayName.trim(),
        passwordHash,
        deviceId: deviceId || null,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true,
        isVerified: true,
      },
    });

    // RGPD art. 7(1): record consent traceability
    const userAgent = request.headers.get('user-agent') || undefined;
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : (request.headers.get('x-real-ip') || undefined);

    await getDb().consent.createMany({
      data: [
        {
          userId: user.id,
          type: 'cgu',
          version: '1',
          given: true,
          ipAddress,
          userAgent,
        },
        {
          userId: user.id,
          type: 'privacy_policy',
          version: '1',
          given: true,
          ipAddress,
          userAgent,
        },
        {
          userId: user.id,
          type: 'cookies_essential',
          version: '1',
          given: true,
          ipAddress,
          userAgent,
        },
      ],
    });

    // Send verification email
    const verifyToken = await createVerificationToken(user.id, email.toLowerCase().trim());
    const verifyUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/verify-email?token=${verifyToken}`;
    await sendVerificationEmail(email.toLowerCase().trim(), verifyUrl);

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}