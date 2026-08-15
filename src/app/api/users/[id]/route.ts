import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { canSeePractices } from '@/lib/profile-visibility';
import { veiledPhotoKeys } from '@/lib/photo-veil';

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
      select: {
        id: true,
        displayName: true,
        isVerified: true,
        lastActive: true,
        isBanned: true,
        profile: {
          select: {
            bio: true,
            birthDate: true,
            genderIdentity: true,
            orientation: true,
            relationshipType: true,
            interests: true,
            practices: true,
            practicesVisibility: true,
            photos: true,
            invisibleMode: true,
          },
        },
        userKey: {
          select: {
            publicKey: true,
          },
        },
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

    const isSelf = user.id === session.user.id;

    if (user.profile) {
      publicProfile.age = age;
      publicProfile.bio = user.profile.bio;
      publicProfile.genderIdentity = user.profile.genderIdentity;
      publicProfile.orientation = user.profile.orientation;
      publicProfile.relationshipType = user.profile.relationshipType;
      publicProfile.interests = user.profile.interests;
      publicProfile.photos = user.profile.photos;

      // Où poser le voile (#330) : calculé ici, avec la même décision que le
      // proxy, pour que l'écran ne puisse pas diverger de ce qui sera servi.
      const viewer = isSelf
        ? null
        : await getDb().profile.findUnique({
            where: { userId: session.user.id },
            select: { photoSensitivityOptIn: true },
          });
      publicProfile.veiledPhotos = await veiledPhotoKeys({
        keys: user.profile.photos,
        viewerThreshold: viewer?.photoSensitivityOptIn,
        isOwner: isSelf,
        // Rôle lu depuis le JWT, et non relu en base comme dans le proxy :
        // ici il ne décide d'aucun accès, seulement de l'endroit où poser le
        // voile. Un jeton périmé afficherait au pire un bouton « Voir » en
        // trop, jamais une photo qui aurait dû rester floutée — la garde, elle,
        // est côté proxy.
        isAdmin: session.user.role === 'ADMIN',
      });

      // Pratiques : réservées aux matches par défaut (#328). La clé est omise
      // quand le lecteur n'y a pas droit — un tableau vide se lirait comme
      // « cette personne n'en a renseigné aucune », ce qui est une autre
      // information que « tu n'y as pas accès ».
      const isMatched = isSelf
        ? false
        : !!(await getDb().match.findFirst({
            where: {
              OR: [
                { userA: session.user.id, userB: user.id },
                { userA: user.id, userB: session.user.id },
              ],
            },
            select: { id: true },
          }));
      if (canSeePractices({ visibility: user.profile.practicesVisibility, isSelf, isMatched })) {
        publicProfile.practices = user.profile.practices;
      }
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