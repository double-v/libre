import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { registerSchema } from '@/lib/validators';
import { normalizeEmail } from '@/lib/email';
import { createVerificationToken } from '@/lib/verify-token';
import { verifyTurnstile } from '@/lib/turnstile';
import { sendVerificationEmail } from '@/lib/email-send';

export async function POST(request: Request) {
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

    // Verify Turnstile captcha
    if (process.env.TURNSTILE_SECRET_KEY) {
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