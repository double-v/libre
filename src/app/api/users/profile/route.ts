import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { profileUpdateSchema } from '@/lib/validators';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getDb().user.findUnique({
      where: { id: session.user.id },
      select: { displayName: true, isVerified: true, profile: true },
    });

    if (!user) {
      return NextResponse.json({ profile: null, displayName: '', isVerified: false }, { status: 200 });
    }

    return NextResponse.json(
      { profile: user.profile, displayName: user.displayName, isVerified: user.isVerified },
      { status: 200 }
    );
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = profileUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const data = parsed.data;

    const updateData: Record<string, unknown> = {};
    const createData: Record<string, unknown> = { userId: session.user.id };

    if (data.bio !== undefined) { updateData.bio = data.bio; createData.bio = data.bio; }
    if (data.birthDate !== undefined) { updateData.birthDate = new Date(data.birthDate); createData.birthDate = new Date(data.birthDate); }
    if (data.genderIdentity !== undefined) { updateData.genderIdentity = data.genderIdentity; createData.genderIdentity = data.genderIdentity; }
    if (data.orientation !== undefined) { updateData.orientation = data.orientation; createData.orientation = data.orientation; }
    if (data.relationshipType !== undefined) { updateData.relationshipType = data.relationshipType; createData.relationshipType = data.relationshipType; }
    if (data.interests !== undefined) { updateData.interests = data.interests; createData.interests = data.interests; }
    if (data.practices !== undefined) { updateData.practices = data.practices; createData.practices = data.practices; }
    if (data.socialLinks !== undefined) { updateData.socialLinks = data.socialLinks; createData.socialLinks = data.socialLinks; }
    if (data.photos !== undefined) { updateData.photos = data.photos; createData.photos = data.photos; }
    if (data.invisibleMode !== undefined) { updateData.invisibleMode = data.invisibleMode; createData.invisibleMode = data.invisibleMode; }
    if (data.maxDistanceKm !== undefined) { updateData.maxDistanceKm = data.maxDistanceKm; createData.maxDistanceKm = data.maxDistanceKm; }
    if (data.ageMin !== undefined) { updateData.ageMin = data.ageMin; createData.ageMin = data.ageMin; }
    if (data.ageMax !== undefined) { updateData.ageMax = data.ageMax; createData.ageMax = data.ageMax; }
    if (data.searchGenders !== undefined) { updateData.searchGenders = data.searchGenders; createData.searchGenders = data.searchGenders; }
    if (data.searchOrientations !== undefined) { updateData.searchOrientations = data.searchOrientations; createData.searchOrientations = data.searchOrientations; }
    if (data.searchInterests !== undefined) { updateData.searchInterests = data.searchInterests; createData.searchInterests = data.searchInterests; }

    const profile = await getDb().profile.upsert({
      where: { userId: session.user.id },
      update: updateData,
      create: createData as never,
    });

    return NextResponse.json({ profile }, { status: 200 });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}