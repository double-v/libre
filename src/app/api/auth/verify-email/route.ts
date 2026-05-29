import { NextResponse } from 'next/server';
import { verifyVerificationToken } from '@/lib/verify-token';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=missing-token', request.url));
  }

  const payload = await verifyVerificationToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL('/login?error=invalid-token', request.url));
  }

  const user = await getDb().user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    return NextResponse.redirect(new URL('/login?error=user-not-found', request.url));
  }

  if (user.emailVerified) {
    return NextResponse.redirect(new URL('/login?verified=true', request.url));
  }

  await getDb().user.update({
    where: { id: payload.userId },
    data: { emailVerified: new Date() },
  });

  return NextResponse.redirect(new URL('/login?verified=true', request.url));
}