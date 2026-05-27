import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { blockSchema } from '@/lib/validators';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = blockSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { blockedId } = parsed.data;
    const blockerId = session.user.id;

    // Cannot block yourself
    if (blockerId === blockedId) {
      return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });
    }

    // Check for existing block
    const existingBlock = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
    });

    if (existingBlock) {
      return NextResponse.json({ error: 'Already blocked' }, { status: 409 });
    }

    // Create the block
    await prisma.block.create({
      data: { blockerId, blockedId },
    });

    // AUTO-UNMATCH: delete any matches between the two users
    // Conversations and messages cascade on match deletion
    await prisma.match.deleteMany({
      where: {
        OR: [
          { userA: blockerId, userB: blockedId },
          { userA: blockedId, userB: blockerId },
        ],
      },
    });

    return NextResponse.json({ blocked: true }, { status: 201 });
  } catch (error) {
    console.error('Block creation error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}