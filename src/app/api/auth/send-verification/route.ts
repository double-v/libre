import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createVerificationToken } from '@/lib/verify-token';
import { sendVerificationEmail } from '@/lib/email-send';
import prisma from '@/lib/db';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (user.emailVerified) {
    return NextResponse.json({ error: 'Already verified' }, { status: 400 });
  }

  const token = await createVerificationToken(user.id, user.email);
  const verifyUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/verify-email?token=${token}`;
  await sendVerificationEmail(user.email, verifyUrl);

  return NextResponse.json({ message: 'Verification email sent' }, { status: 200 });
}