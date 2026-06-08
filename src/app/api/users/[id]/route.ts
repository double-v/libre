import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const user = await getDb().user.findUnique({
      where: { id },
      include: {
        profile: true,
        userKey: true,
      },
    });

    if (!user || user.isBanned) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Privacy: invisible users are not visible to anyone but themselves.
    // Return 404 (not 403) to avoid leaking the account's existence.
    if (user.profile?.invisibleMode && user.id !== session.user.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Compute age from birthDate — never expose the raw date.
    const age = user.profile?.birthDate
      ? Math.floor((Date.now() - user.profile.birthDate.getTime()) / (365.25 * 24 * 3600 * 1000))
      : null;

    // Strip email and passwordHash for privacy
    const publicProfile: Record<string, unknown> = {
      id: user.id,
      displayName: user.displayName,
      isVerified: user.isVerified,
      lastActive: user.lastActive,
    };

    if (user.profile) {
      publicProfile.age = age;
      publicProfile.bio = user.profile.bio;
      publicProfile.genderIdentity = user.profile.genderIdentity;
      publicProfile.orientation = user.profile.orientation;
      publicProfile.relationshipType = user.profile.relationshipType;
      publicProfile.interests = user.profile.interests;
      publicProfile.practices = user.profile.practices;
      publicProfile.photos = user.profile.photos;
    }

    if (user.userKey) {
      publicProfile.publicKey = user.userKey.publicKey;
    }

    return NextResponse.json(publicProfile, { status: 200 });
  } catch (error) {
    console.error('Public profile fetch error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}