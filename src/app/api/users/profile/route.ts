import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { profileUpdateSchema } from '@/lib/validators';
import { photoSensitivityMap } from '@/lib/photo-veil';

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

    // Classification de ses propres photos (#330) : le propriétaire les voit
    // toujours nettes, mais doit savoir lesquelles arrivent floutées aux autres
    // — sans ça la classification serait une sanction invisible.
    const photoSensitivity = await photoSensitivityMap(user.profile?.photos ?? []);

    return NextResponse.json(
      {
        profile: user.profile,
        displayName: user.displayName,
        isVerified: user.isVerified,
        photoSensitivity,
      },
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
    if (data.practicesVisibility !== undefined) { updateData.practicesVisibility = data.practicesVisibility; createData.practicesVisibility = data.practicesVisibility; }
    if (data.photoSensitivityOptIn !== undefined) { updateData.photoSensitivityOptIn = data.photoSensitivityOptIn; createData.photoSensitivityOptIn = data.photoSensitivityOptIn; }
    if (data.socialLinks !== undefined) { updateData.socialLinks = data.socialLinks; createData.socialLinks = data.socialLinks; }
    if (data.photos !== undefined) { updateData.photos = data.photos; createData.photos = data.photos; }
    if (data.invisibleMode !== undefined) { updateData.invisibleMode = data.invisibleMode; createData.invisibleMode = data.invisibleMode; }
    if (data.maxDistanceKm !== undefined) { updateData.maxDistanceKm = data.maxDistanceKm; createData.maxDistanceKm = data.maxDistanceKm; }
    if (data.ageMin !== undefined) { updateData.ageMin = data.ageMin; createData.ageMin = data.ageMin; }
    if (data.ageMax !== undefined) { updateData.ageMax = data.ageMax; createData.ageMax = data.ageMax; }
    if (data.searchGenders !== undefined) { updateData.searchGenders = data.searchGenders; createData.searchGenders = data.searchGenders; }
    if (data.searchOrientations !== undefined) { updateData.searchOrientations = data.searchOrientations; createData.searchOrientations = data.searchOrientations; }
    if (data.searchInterests !== undefined) { updateData.searchInterests = data.searchInterests; createData.searchInterests = data.searchInterests; }
    // `null` porte du sens ici (« partout ») : seul `undefined` veut dire
    // « champ non fourni, n'y touche pas » (#327).
    if (data.searchDistanceKm !== undefined) { updateData.searchDistanceKm = data.searchDistanceKm; createData.searchDistanceKm = data.searchDistanceKm; }

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