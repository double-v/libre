import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
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
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { email, password, displayName, turnstileToken, deviceId } = parsed.data;

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
      const deviceCount = await prisma.user.count({
        where: { deviceId },
      });
      if (deviceCount >= 2) {
        return NextResponse.json(
          { error: 'Nombre maximum de comptes atteint sur cet appareil' },
          { status: 403 },
        );
      }
    }

    const normalizedEmail = normalizeEmail(email);

    const existingUser = await prisma.user.findUnique({ where: { normalizedEmail } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email déjà utilisé' },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
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