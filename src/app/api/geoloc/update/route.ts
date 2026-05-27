import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { geolocUpdateSchema } from '@/lib/validators';
import { fuzzLocation, haversineDistance, roundDistance, isWithinRadius } from '@/lib/geoloc';

const CROSSING_RADIUS_M = 500;
const CROSSING_COOLDOWN_H = 24;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    await prisma.profile.upsert({
      where: { userId },
      update: { lastKnownLat: fuzzed.lat, lastKnownLng: fuzzed.lng },
      create: {
        userId,
        lastKnownLat: fuzzed.lat,
        lastKnownLng: fuzzed.lng,
      },
    });

    // Fetch all other users with non-default positions
    const otherProfiles = await prisma.profile.findMany({
      where: {
        userId: { not: userId },
        lastKnownLat: { not: 0 },
        lastKnownLng: { not: 0 },
      },
      include: { user: true },
    });

    // Check for blocks involving the current user
    const blocks = await prisma.block.findMany({
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

      // Check for existing encounter in the last 24h for this pair
      const existing = await prisma.encounter.findFirst({
        where: {
          OR: [
            { userA: userId, userB: otherUserId, happenedAt: { gte: cutoff } },
            { userA: otherUserId, userB: userId, happenedAt: { gte: cutoff } },
          ],
        },
      });

      if (existing) continue;

      // Create encounter with fuzzed position and rounded distance
      const fuzzed = fuzzLocation(latitude, longitude);
      const rounded = roundDistance(distanceM);

      await prisma.encounter.create({
        data: {
          userA: userId,
          userB: otherUserId,
          latitude: fuzzed.lat,
          longitude: fuzzed.lng,
          distanceM: rounded,
        },
      });

      crossings.push(otherUserId);
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