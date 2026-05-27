import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { likeSchema } from '@/lib/validators';

const DAILY_LIKE_LIMIT = 50;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = likeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { likedId } = parsed.data;
    const likerId = session.user.id;

    // Cannot like yourself
    if (likerId === likedId) {
      return NextResponse.json({ error: 'Cannot like yourself' }, { status: 400 });
    }

    // Check if a block exists between the two users (in either direction)
    const block = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: likerId, blockedId: likedId },
          { blockerId: likedId, blockedId: likerId },
        ],
      },
    });

    if (block) {
      return NextResponse.json({ error: 'Cannot like due to block' }, { status: 403 });
    }

    // Check daily like limit
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayLikeCount = await prisma.like.count({
      where: {
        likerId,
        createdAt: { gte: startOfDay },
      },
    });

    if (todayLikeCount >= DAILY_LIKE_LIMIT) {
      return NextResponse.json(
        { error: 'Daily like limit exceeded', limit: DAILY_LIKE_LIMIT },
        { status: 429 },
      );
    }

    // Check for duplicate like
    const existingLike = await prisma.like.findUnique({
      where: {
        likerId_likedId: { likerId, likedId },
      },
    });

    if (existingLike) {
      return NextResponse.json({ error: 'Already liked' }, { status: 409 });
    }

    // Create the like
    await prisma.like.create({
      data: { likerId, likedId },
    });

    // Check for reciprocal like (did the other person already like us?)
    const reciprocalLike = await prisma.like.findUnique({
      where: {
        likerId_likedId: { likerId: likedId, likedId: likerId },
      },
    });

    let matchId: string | undefined;

    if (reciprocalLike) {
      // Mutual like — create a match
      const [userA, userB] = likerId < likedId ? [likerId, likedId] : [likedId, likerId];

      const match = await prisma.match.create({
        data: {
          userA,
          userB,
          conversation: {
            create: {
              userA,
              userB,
            },
          },
        },
        include: { conversation: true },
      });

      matchId = match.id;
    }

    return NextResponse.json(
      {
        liked: true,
        match: matchId !== undefined,
        ...(matchId && { matchId }),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Like error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}