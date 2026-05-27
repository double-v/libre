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

    const encounters = await prisma.encounter.findMany({
      where: {
        OR: [
          { userA: userId },
          { userB: userId },
        ],
      },
      include: {
        userARel: {
          select: {
            id: true,
            displayName: true,
            isVerified: true,
            profile: {
              select: {
                bio: true,
                genderIdentity: true,
                orientation: true,
                relationshipType: true,
                interests: true,
                photos: true,
              },
            },
          },
        },
        userBRel: {
          select: {
            id: true,
            displayName: true,
            isVerified: true,
            profile: {
              select: {
                bio: true,
                genderIdentity: true,
                orientation: true,
                relationshipType: true,
                interests: true,
                photos: true,
              },
            },
          },
        },
      },
      orderBy: { happenedAt: 'desc' },
      take: 50,
    });

    const crossings = encounters.map((e) => {
      const isUserA = e.userA === userId;
      const other = isUserA ? e.userBRel : e.userARel;

      return {
        id: other.id,
        displayName: other.displayName,
        isVerified: other.isVerified,
        profile: other.profile,
        distanceM: e.distanceM,
        happenedAt: e.happenedAt,
      };
    });

    return NextResponse.json({ crossings }, { status: 200 });
  } catch (error) {
    console.error('Crossings fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}