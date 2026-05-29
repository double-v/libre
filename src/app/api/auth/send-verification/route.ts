import { NextResponse } from 'next/server';
import { createVerificationToken } from '@/lib/verify-token';
import { sendVerificationEmail } from '@/lib/email-send';
import { normalizeEmail } from '@/lib/email';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body.email as string)?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await getDb().user.findUnique({ where: { normalizedEmail } });

    if (!user) {
      return NextResponse.json({ message: 'Si un compte existe avec cet email, un lien de vérification a été envoyé.' }, { status: 200 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ message: 'Si un compte existe avec cet email, un lien de vérification a été envoyé.' }, { status: 200 });
    }

    const token = await createVerificationToken(user.id, user.email);
    const verifyUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/verify-email?token=${token}`;
    await sendVerificationEmail(user.email, verifyUrl);

    return NextResponse.json({ message: 'Si un compte existe avec cet email, un lien de vérification a été envoyé.' }, { status: 200 });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json({ error: 'Erreur lors de l\'envoi, veuillez réessayer' }, { status: 500 });
  }
}