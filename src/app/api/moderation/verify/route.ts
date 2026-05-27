import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { verificationRequestSchema } from '@/lib/validators';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = verificationRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { selfieUrl } = parsed.data;
    const userId = session.user.id;

    // Check for existing pending verification request
    const existingPending = await prisma.verificationRequest.findFirst({
      where: {
        userId,
        status: 'pending',
      },
    });

    if (existingPending) {
      return NextResponse.json(
        { error: 'A pending verification request already exists' },
        { status: 409 },
      );
    }

    const verificationRequest = await prisma.verificationRequest.create({
      data: {
        userId,
        selfieUrl,
        status: 'pending',
      },
    });

    return NextResponse.json({ verificationRequest }, { status: 201 });
  } catch (error) {
    console.error('Verification request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}