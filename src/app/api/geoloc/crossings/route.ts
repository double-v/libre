import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get blocked user IDs to exclude from crossings
    const blocks = await getDb().block.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    });
    const blockedIds = new Set<string>();
    for (const b of blocks) {
      blockedIds.add(b.blockerId === userId ? b.blockedId : b.blockerId);
    }

    // Get already-liked user IDs
    const likes = await getDb().like.findMany({
      where: { likerId: userId },
      select: { likedId: true },
    });
    const likedIds = new Set(likes.map((l) => l.likedId));

    const encounters = await getDb().encounter.findMany({
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
            isBanned: true,
            isVerified: true,
            profile: {
              select: {
                bio: true,
                genderIdentity: true,
                orientation: true,
                relationshipType: true,
                interests: true,
                photos: true,
                invisibleMode: true,
              },
            },
          },
        },
        userBRel: {
          select: {
            id: true,
            displayName: true,
            isBanned: true,
            isVerified: true,
            profile: {
              select: {
                bio: true,
                genderIdentity: true,
                orientation: true,
                relationshipType: true,
                interests: true,
                photos: true,
                invisibleMode: true,
              },
            },
          },
        },
      },
      orderBy: { happenedAt: 'desc' },
      take: 50,
    });

    const crossings = encounters
      .filter((e) => {
        const isUserA = e.userA === userId;
        const other = isUserA ? e.userBRel : e.userARel;
        if (other.isBanned) return false;
        if (blockedIds.has(other.id)) return false;
        if (likedIds.has(other.id)) return false;
        if (other.profile?.invisibleMode) return false;
        return true;
      })
      .map((e) => {
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
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}