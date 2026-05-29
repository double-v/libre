import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { haversineDistance } from '@/lib/geoloc';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get current user's profile for position and maxDistanceKm
    const myProfile = await getDb().profile.findUnique({
      where: { userId },
    });

    if (!myProfile || (myProfile.lastKnownLat === 0 && myProfile.lastKnownLng === 0)) {
      return NextResponse.json({ nearby: [] }, { status: 200 });
    }

    // Fetch all other users with non-default positions
    const otherProfiles = await getDb().profile.findMany({
      where: {
        userId: { not: userId },
        lastKnownLat: { not: 0 },
        lastKnownLng: { not: 0 },
      },
      include: { user: true },
    });

    // Check for blocks involving the current user
    const blocks = await getDb().block.findMany({
      where: {
        OR: [
          { blockerId: userId },
          { blockedId: userId },
        ],
      },
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

    const maxDistanceKm = myProfile.maxDistanceKm;
    const nearby = [];

    for (const otherProfile of otherProfiles) {
      const otherUserId = otherProfile.userId;

      // Skip banned users
      if (otherProfile.user.isBanned) continue;

      // Skip invisible users
      if (otherProfile.invisibleMode) continue;

      // Skip blocked users
      if (blockedIds.has(otherUserId)) continue;

      // Skip already-liked users
      if (likedIds.has(otherUserId)) continue;

      // Check distance
      const distanceM = haversineDistance(
        myProfile.lastKnownLat,
        myProfile.lastKnownLng,
        otherProfile.lastKnownLat,
        otherProfile.lastKnownLng,
      );

      const distanceKm = distanceM / 1000;
      if (distanceKm > maxDistanceKm) continue;

      nearby.push({
        id: otherUserId,
        displayName: otherProfile.user.displayName,
        isVerified: otherProfile.user.isVerified,
        profile: {
          bio: otherProfile.bio,
          genderIdentity: otherProfile.genderIdentity,
          orientation: otherProfile.orientation,
          relationshipType: otherProfile.relationshipType,
          interests: otherProfile.interests,
          photos: otherProfile.photos,
        },
        // Coarse distance buckets to prevent trilateration
        distanceKm: distanceKm < 1 ? 1 : Math.round(distanceKm),
      });
    }

    // Sort by distance ascending
    nearby.sort((a, b) => a.distanceKm - b.distanceKm);

    return NextResponse.json({ nearby }, { status: 200 });
  } catch (error) {
    console.error('Nearby fetch error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}