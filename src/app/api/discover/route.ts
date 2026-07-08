import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { haversineDistance } from '@/lib/geoloc';
import { rateLimit, limits } from '@/lib/rate-limit';

const PAGE_SIZE = 20;
const ONLINE_THRESHOLD_MS = 15 * 60 * 1000;

// Curseur de pagination pour l'onglet `nearby` (issue #180). Contrairement aux
// tabs `online`/`all` qui paginent via un curseur Prisma sur `userId`, `nearby`
// trie par distance calculée en mémoire (haversine). Le curseur encode donc la
// position dans la liste triée : (distance km, userId) — le userId départage les
// ex æquo pour un ordre stable. Base64url pour rester opaque côté client.
function encodeNearbyCursor(distanceKm: number, userId: string): string {
  return Buffer.from(`${distanceKm}|${userId}`).toString('base64url');
}

function decodeNearbyCursor(cursor: string): { distanceKm: number; userId: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const sep = decoded.indexOf('|');
    if (sep === -1) return null;
    const distanceKm = Number(decoded.slice(0, sep));
    const userId = decoded.slice(sep + 1);
    if (!Number.isFinite(distanceKm) || !userId) return null;
    return { distanceKm, userId };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = await rateLimit(`discover:${session.user.id}`, limits.discover.limit, limits.discover.windowMs);
    if (!rl.success) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
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

    // Push filters into the Prisma where clause (issue #147 — previously these
    // were applied client-side after fetch, which broke pagination: the DB
    // returned PAGE_SIZE+1 rows, the JS filter eliminated most, and the user
    // got a sparse feed instead of a full page).
    const now = Date.now();
    const ageMaxBirthDate = new Date(now - ageMaxFilter * 365.25 * 24 * 60 * 60 * 1000);
    const ageMinBirthDate = new Date(now - ageMinFilter * 365.25 * 24 * 60 * 60 * 1000);

    const filterWhere = {
      ...(genderFilter.length > 0 ? { genderIdentity: { in: genderFilter } } : {}),
      ...(orientationFilter.length > 0 ? { orientation: { hasSome: orientationFilter } } : {}),
      ...(interestsFilter.length > 0 ? { interests: { hasSome: interestsFilter } } : {}),
      ...(ageMinFilter > 18 || ageMaxFilter < 99
        ? { birthDate: { gte: ageMaxBirthDate, lte: ageMinBirthDate } }
        : {}),
    };

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
    // + push DB-side filters (issue #147: gender, orientation, age, interests
    // are now in the Prisma where clause, not filtered client-side).
    const baseWhere = {
      user: {
        id: { not: userId },
        isBanned: false,
      },
      invisibleMode: false,
      userId: { notIn: excludeIds },
      ...filterWhere,
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

    // Pagination propre à `nearby` (tri en mémoire par distance) : quand elle est
    // renseignée (non-null), elle prime sur la pagination générique par curseur userId.
    let nearbyPagination: { nextCursor: string | null } | null = null;

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
        return NextResponse.json({ users: [], nextCursor: null, reason: 'geoloc_required' });
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
        // Tri stable : distance croissante puis userId, pour que le curseur
        // (distance, userId) découpe la liste sans doublon ni trou (issue #180).
        .sort((a, b) =>
          a.distanceKm - b.distanceKm ||
          (a.profile.userId < b.profile.userId ? -1 : a.profile.userId > b.profile.userId ? 1 : 0),
        );

      // Applique le curseur : ne garde que les profils strictement APRÈS la
      // position encodée. Curseur absent/illisible → page 1 (dégradation douce).
      const decoded = cursor ? decodeNearbyCursor(cursor) : null;
      const afterCursor = decoded
        ? withDistance.filter(({ profile: p, distanceKm }) =>
            distanceKm > decoded.distanceKm ||
            (distanceKm === decoded.distanceKm && p.userId > decoded.userId),
          )
        : withDistance;

      // On lit PAGE_SIZE+1 pour savoir s'il reste une page suivante.
      const pagePlus = afterCursor.slice(0, PAGE_SIZE + 1);
      const hasMoreNearby = pagePlus.length > PAGE_SIZE;
      const pageItems = pagePlus.slice(0, PAGE_SIZE);
      const last = pageItems[pageItems.length - 1];
      nearbyPagination = {
        nextCursor: hasMoreNearby && last
          ? encodeNearbyCursor(last.distanceKm, last.profile.userId)
          : null,
      };

      profiles = pageItems.map(({ profile: p, distanceKm }) => ({
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

    // Pagination: we fetched PAGE_SIZE+1, if we have more than PAGE_SIZE there's a next page
    // (issue #147: filters are now in the DB query, so profiles is already filtered).
    // Pour `nearby` (issue #180) le découpage est déjà fait dans la branche : on
    // utilise son curseur composite (distance, userId) au lieu du curseur userId.
    const users = profiles.slice(0, PAGE_SIZE);
    const nextCursor = nearbyPagination
      ? nearbyPagination.nextCursor
      : profiles.length > PAGE_SIZE && users.length > 0
        ? users[users.length - 1].userId
        : null;

    // issue #137: distinguish "geoloc active but nobody nearby" from other empty tabs,
    // so the frontend doesn't show a generic empty state when geoloc is the real blocker.
    if (tab === 'nearby' && users.length === 0) {
      return NextResponse.json({ users, nextCursor, reason: 'empty_feed' });
    }

    return NextResponse.json({ users, nextCursor });
  } catch (error) {
    console.error('Discover error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}