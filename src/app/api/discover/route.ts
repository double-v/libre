import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { haversineDistance } from '@/lib/geoloc';

const PAGE_SIZE = 20;
const ONLINE_THRESHOLD_MS = 15 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = request.nextUrl;
    const tab = searchParams.get('tab') || 'all';
    const cursor = searchParams.get('cursor') || undefined;
    const genderFilter = searchParams.get('gender')?.split(',').filter(Boolean) || [];
    const orientationFilter = searchParams.get('orientation')?.split(',').filter(Boolean) || [];
    const ageMinFilter = parseInt(searchParams.get('ageMin') || '18', 10);
    const ageMaxFilter = parseInt(searchParams.get('ageMax') || '99', 10);
    const interestsFilter = searchParams.get('interests')?.split(',').filter(Boolean) || [];

    // Get current user's profile for nearby tab
    const myProfile = await getDb().profile.findUnique({ where: { userId } });

    // Get blocked user IDs
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

    const excludeIds = [...blockedIds, ...likedIds];

    // Build base where clause: exclude self, banned, invisible, blocked, already-liked
    const baseWhere = {
      user: {
        id: { not: userId },
        isBanned: false,
      },
      invisibleMode: false,
      userId: { notIn: excludeIds },
    };

    let profiles: Array<{
      userId: string;
      displayName: string;
      bio: string;
      birthDate: Date | null;
      genderIdentity: string;
      orientation: string[];
      interests: string[];
      practices: string[];
      photos: string[];
      isVerified: boolean;
      lastActive: Date;
      distanceKm?: number;
      online: boolean;
      age: number | null;
    }> = [];

    if (tab === 'online') {
      const onlineThreshold = new Date(Date.now() - ONLINE_THRESHOLD_MS);
      const dbProfiles = await getDb().profile.findMany({
        where: {
          ...baseWhere,
          user: { ...baseWhere.user, lastActive: { gte: onlineThreshold } },
        },
        include: { user: { select: { id: true, displayName: true, isVerified: true, lastActive: true } } },
        take: PAGE_SIZE + 1,
        ...(cursor ? { skip: 1, cursor: { userId: cursor } } : {}),
        orderBy: { user: { lastActive: 'desc' } },
      });

      profiles = dbProfiles.map((p) => ({
        userId: p.userId,
        displayName: p.user.displayName,
        bio: p.bio,
        birthDate: p.birthDate,
        genderIdentity: p.genderIdentity,
        orientation: p.orientation,
        interests: p.interests,
        practices: p.practices,
        photos: p.photos,
        isVerified: p.user.isVerified,
        lastActive: p.user.lastActive,
        online: true,
        age: p.birthDate
          ? Math.floor((Date.now() - p.birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : null,
      }));
    } else if (tab === 'nearby') {
      if (!myProfile || (myProfile.lastKnownLat === 0 && myProfile.lastKnownLng === 0)) {
        return NextResponse.json({ users: [], nextCursor: null });
      }
      const maxDist = myProfile.maxDistanceKm || 50;
      const allProfiles = await getDb().profile.findMany({
        where: {
          ...baseWhere,
          lastKnownLat: { not: 0 },
          lastKnownLng: { not: 0 },
        },
        include: { user: { select: { id: true, displayName: true, isVerified: true, lastActive: true } } },
      });

      const now = Date.now();
      const onlineThreshold = new Date(now - ONLINE_THRESHOLD_MS);
      const withDistance = allProfiles
        .map((p) => {
          const distM = haversineDistance(
            myProfile.lastKnownLat, myProfile.lastKnownLng,
            p.lastKnownLat, p.lastKnownLng,
          );
          return { profile: p, distanceKm: distM / 1000 };
        })
        .filter(({ distanceKm }) => distanceKm <= maxDist)
        .sort((a, b) => a.distanceKm - b.distanceKm);

      profiles = withDistance.map(({ profile: p, distanceKm }) => ({
        userId: p.userId,
        displayName: p.user.displayName,
        bio: p.bio,
        birthDate: p.birthDate,
        genderIdentity: p.genderIdentity,
        orientation: p.orientation,
        interests: p.interests,
        practices: p.practices,
        photos: p.photos,
        isVerified: p.user.isVerified,
        lastActive: p.user.lastActive,
        online: p.user.lastActive >= onlineThreshold,
        distanceKm: distanceKm < 1 ? 1 : Math.round(distanceKm),
        age: p.birthDate
          ? Math.floor((Date.now() - p.birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : null,
      }));
    } else {
      // tab === 'all'
      const now = Date.now();
      const onlineThreshold = new Date(now - ONLINE_THRESHOLD_MS);
      const dbProfiles = await getDb().profile.findMany({
        where: baseWhere,
        include: { user: { select: { id: true, displayName: true, isVerified: true, lastActive: true } } },
        take: PAGE_SIZE + 1,
        ...(cursor ? { skip: 1, cursor: { userId: cursor } } : {}),
        orderBy: { user: { lastActive: 'desc' } },
      });

      profiles = dbProfiles.map((p) => ({
        userId: p.userId,
        displayName: p.user.displayName,
        bio: p.bio,
        birthDate: p.birthDate,
        genderIdentity: p.genderIdentity,
        orientation: p.orientation,
        interests: p.interests,
        practices: p.practices,
        photos: p.photos,
        isVerified: p.user.isVerified,
        lastActive: p.user.lastActive,
        online: p.user.lastActive >= onlineThreshold,
        age: p.birthDate
          ? Math.floor((Date.now() - p.birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : null,
      }));
    }

    // Apply client-side filters (gender, orientation, age, interests)
    const filtered = profiles.filter((p) => {
      if (genderFilter.length > 0 && !genderFilter.includes(p.genderIdentity)) return false;
      if (orientationFilter.length > 0 && !p.orientation.some((o) => orientationFilter.includes(o))) return false;
      if (p.age !== null) {
        if (p.age < ageMinFilter || p.age > ageMaxFilter) return false;
      }
      if (interestsFilter.length > 0 && !p.interests.some((i) => interestsFilter.includes(i))) return false;
      return true;
    });

    // Pagination: we fetched PAGE_SIZE+1, if we have more than PAGE_SIZE there's a next page
    const hasMore = filtered.length > PAGE_SIZE;
    const users = filtered.slice(0, PAGE_SIZE);
    const nextCursor = hasMore && users.length > 0 ? users[users.length - 1].userId : null;

    return NextResponse.json({ users, nextCursor });
  } catch (error) {
    console.error('Discover error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}