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

// Startup validation: TURNSTILE_SECRET_KEY and TURNSTILE_SITE_KEY must be
// configured together. The site key is needed on the client widget, the
// secret key on the server. If only one is present, log a warning so the
// misconfiguration is visible in logs — but don't crash, so a partial
// deployment doesn't take the whole API down.
if (process.env.TURNSTILE_SECRET_KEY && !process.env.TURNSTILE_SITE_KEY) {
  console.warn(
    '[Turnstile] TURNSTILE_SECRET_KEY is set but TURNSTILE_SITE_KEY is missing. ' +
      'The captcha widget will not render on the client. Both must be configured together.',
  );
} else if (process.env.TURNSTILE_SITE_KEY && !process.env.TURNSTILE_SECRET_KEY) {
  console.warn(
    '[Turnstile] TURNSTILE_SITE_KEY is set but TURNSTILE_SECRET_KEY is missing. ' +
      'Server-side verification cannot run. Both must be configured together.',
  );
}

export async function POST(request: Request) {
  // Rate limit by IP: 5 attempts per minute (see #27). Protects against
  // bot-driven account creation spam.
  const ip = getClientIp(request);
  const rl = await rateLimit(`auth:register:${ip}`, limits.auth.limit, limits.auth.windowMs);
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
    //
    // Turnstile is required whenever TURNSTILE_SECRET_KEY is configured.
    // This naturally covers production AND Vercel preview deploys (which
    // set NODE_ENV=production and expose publicly-accessible URLs that
    // bots can spam). In local dev (no secret configured), the captcha
    // is skipped so CI E2E tests can run without a Turnstile key.
    //
    // Previously, previews were explicitly excluded via
    // `VERCEL_ENV === 'preview'`, which created a bypass on publicly
    // accessible preview URLs (issue #144).
    //
    // Both TURNSTILE_SECRET_KEY and TURNSTILE_SITE_KEY must be set
    // together — the site key is needed on the client widget and the
    // secret key on the server. If only one is configured, log a
    // warning at module load (see below) but don't crash.
    const requireTurnstile = !!process.env.TURNSTILE_SECRET_KEY;
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

    // Check device limit.
    //
    // NOTE: This is a soft deterrent against multi-account creation, NOT
    // a real protection. A determined attacker can simply generate a
    // new random deviceId per request to bypass this limit entirely.
    // The primary anti-bot defence is Turnstile (above) combined with
    // the per-IP rate limiter. The deviceId check only raises the bar
    // for naive scripts that reuse the same identifier.
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
        email: normalizedEmail,
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
    const verifyToken = await createVerificationToken(user.id, normalizedEmail);
    const verifyUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/verify-email?token=${verifyToken}`;
    await sendVerificationEmail(normalizedEmail, verifyUrl);

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}