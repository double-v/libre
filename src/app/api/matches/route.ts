import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const matches = await prisma.match.findMany({
      where: {
        OR: [{ userA: userId }, { userB: userId }],
      },
      include: {
        userARel: {
          select: {
            id: true,
            displayName: true,
            profile: {
              select: {
                bio: true,
                photos: true,
                genderIdentity: true,
                orientation: true,
                interests: true,
              },
            },
          },
        },
        userBRel: {
          select: {
            id: true,
            displayName: true,
            profile: {
              select: {
                bio: true,
                photos: true,
                genderIdentity: true,
                orientation: true,
                interests: true,
              },
            },
          },
        },
        conversation: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = matches.map((match) => {
      const otherUser = match.userA === userId ? match.userBRel : match.userARel;
      return {
        id: match.id,
        createdAt: match.createdAt,
        user: {
          id: otherUser.id,
          displayName: otherUser.displayName,
          profile: otherUser.profile,
        },
        conversationId: match.conversation?.id ?? null,
      };
    });

    return NextResponse.json({ matches: result }, { status: 200 });
  } catch (error) {
    console.error('Matches list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}