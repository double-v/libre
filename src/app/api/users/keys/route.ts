import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { publicKey } = body;

    if (!publicKey || typeof publicKey !== 'string') {
      return NextResponse.json(
        { error: 'Validation failed', details: { publicKey: ['Required and must be a string'] } },
        { status: 400 },
      );
    }

    await prisma.userKey.upsert({
      where: { userId: session.user.id },
      update: { publicKey },
      create: {
        userId: session.user.id,
        publicKey,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('User key update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}