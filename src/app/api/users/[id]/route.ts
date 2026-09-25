import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { canSeePractices, intentionFor } from '@/lib/profile-visibility';
import { veiledPhotoKeys } from '@/lib/photo-veil';
import { answersFor } from '@/lib/answers';

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
        // Clés publiques remplacées par une réinitialisation (#340), de la plus
        // récente à la plus ancienne : le lecteur essaie la courante, puis
        // celles-ci, pour relire ce qu'il avait chiffré avant.
        userKeyHistory: {
          select: { publicKey: true },
          orderBy: { replacedAt: 'desc' },
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
      publicProfile.interests = user.profile.interests;
      publicProfile.photos = user.profile.photos;

      // Où poser le voile (#330) : calculé ici, avec la même décision que le
      // proxy, pour que l'écran ne puisse pas diverger de ce qui sera servi.
      const viewer = isSelf
        ? null
        : await getDb().profile.findUnique({
            where: { userId: session.user.id },
            select: { photoSensitivityOptIn: true, relationshipType: true },
          });

      // Intention en miroir (spec 008) : voilée tant que la lectrice n'a pas
      // dit la sienne. Lectrice introuvable → voilée : l'échec ferme.
      Object.assign(
        publicProfile,
        intentionFor({
          isSelf,
          viewerIntention: viewer?.relationshipType,
          relationshipType: user.profile.relationshipType,
        }),
      );
      // Réponses aux questions, en miroir question par question (spec 009) :
      // le texte ou le choix d'une réponse ne part que si la lectrice a une
      // réponse publiée à la même question. Ses réponses illisibles →
      // `undefined` → tout voilé ; celles de la personne illisibles → aucune
      // réponse, mais la fiche reste lisible. L'échec ferme, sans tout casser.
      const serialized = await lireReponses(user.id, session.user.id, isSelf);
      if (serialized.length > 0) publicProfile.answers = serialized;

      publicProfile.veiledPhotos = await veiledPhotoKeys({
        keys: user.profile.photos,
        viewerThreshold: viewer?.photoSensitivityOptIn,
        isOwner: isSelf,
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
    if (user.userKeyHistory.length > 0) {
      publicProfile.previousPublicKeys = user.userKeyHistory.map((k) => k.publicKey);
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

async function lireReponses(personId: string, viewerId: string, isSelf: boolean) {
  const db = getDb();
  let answers;
  try {
    answers = await db.profileAnswer.findMany({
      where: { userId: personId },
      select: { id: true, questionKey: true, choices: true, text: true, status: true },
    });
  } catch {
    return [];
  }
  let viewerKeys: Set<string> | undefined;
  if (!isSelf) {
    try {
      const mine = await db.profileAnswer.findMany({
        where: { userId: viewerId, status: 'published' },
        select: { questionKey: true },
      });
      viewerKeys = new Set(mine.map((a) => a.questionKey));
    } catch {
      viewerKeys = undefined;
    }
  }
  return answersFor({ isSelf, viewerKeys, answers });
}
