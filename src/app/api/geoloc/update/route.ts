import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { geolocUpdateSchema } from '@/lib/validators';
import { fuzzLocation, haversineDistance, roundDistance, isWithinRadius } from '@/lib/geoloc';
import { rateLimit, limits } from '@/lib/rate-limit';

const CROSSING_RADIUS_M = 500;
const CROSSING_COOLDOWN_H = 24;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = rateLimit(`geoloc:${session.user.id}`, limits.geoloc.limit, limits.geoloc.windowMs);
    if (!rl.success) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = geolocUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { latitude, longitude } = parsed.data;
    const userId = session.user.id;

    // Store fuzzed coordinates — never persist raw GPS
    const fuzzed = fuzzLocation(latitude, longitude);

    await getDb().profile.upsert({
      where: { userId },
      update: { lastKnownLat: fuzzed.lat, lastKnownLng: fuzzed.lng },
      create: {
        userId,
        lastKnownLat: fuzzed.lat,
        lastKnownLng: fuzzed.lng,
      },
    });

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

    const crossings: string[] = [];
    const cutoff = new Date(Date.now() - CROSSING_COOLDOWN_H * 60 * 60 * 1000);

    // Step 1: filter candidates locally (in-app, no extra query per profile)
    const candidates: { otherUserId: string; distanceM: number }[] = [];
    for (const otherProfile of otherProfiles) {
      const otherUserId = otherProfile.userId;

      // Skip banned users
      if (otherProfile.user.isBanned) continue;

      // Skip invisible users — they are not visible to others
      if (otherProfile.invisibleMode) continue;

      // Skip blocked users
      if (blockedIds.has(otherUserId)) continue;

      // Check proximity
      const distanceM = haversineDistance(
        latitude,
        longitude,
        otherProfile.lastKnownLat,
        otherProfile.lastKnownLng,
      );

      if (!isWithinRadius(latitude, longitude, otherProfile.lastKnownLat, otherProfile.lastKnownLng, CROSSING_RADIUS_M / 1000)) {
        continue;
      }

      candidates.push({ otherUserId, distanceM });
    }

    // Step 2: one findMany to fetch all existing encounters in the cooldown window
    // for the (userId, candidates) pairs — replaces N findFirst calls
    if (candidates.length > 0) {
      const candidateIds = candidates.map((c) => c.otherUserId);
      const existingEncounters = await getDb().encounter.findMany({
        where: {
          OR: [
            { userA: userId, userB: { in: candidateIds }, happenedAt: { gte: cutoff } },
            { userB: userId, userA: { in: candidateIds }, happenedAt: { gte: cutoff } },
          ],
        },
        select: { userA: true, userB: true },
      });

      // Build a set of "other user ids" that already have a recent encounter
      const alreadyEncountered = new Set<string>();
      for (const e of existingEncounters) {
        alreadyEncountered.add(e.userA === userId ? e.userB : e.userA);
      }

      // Step 3: one createMany for the new encounters — replaces N create calls
      const fuzzed = fuzzLocation(latitude, longitude);
      const newEncounters = candidates
        .filter((c) => !alreadyEncountered.has(c.otherUserId))
        .map((c) => ({
          userA: userId,
          userB: c.otherUserId,
          latitude: fuzzed.lat,
          longitude: fuzzed.lng,
          distanceM: roundDistance(c.distanceM),
        }));

      if (newEncounters.length > 0) {
        await getDb().encounter.createMany({
          data: newEncounters,
        });
      }

      for (const c of candidates) {
        if (!alreadyEncountered.has(c.otherUserId)) {
          crossings.push(c.otherUserId);
        }
      }
    }

    return NextResponse.json({ crossings }, { status: 200 });
  } catch (error) {
    console.error('Geoloc update error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}