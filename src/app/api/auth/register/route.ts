import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { registerSchema } from '@/lib/validators';
import { normalizeEmail } from '@/lib/email';

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

    const { email, password, displayName } = parsed.data;
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
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true,
        isVerified: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}