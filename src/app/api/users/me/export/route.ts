import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';

/**
 * RGPD art. 20 — Right to data portability
 * Export all user data in a structured, machine-readable JSON format.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch all user data
    const [user, profile, userKey, sentLikes, receivedLikes, matchesAsA, matchesAsB, conversations, encountersAsA, encountersAsB, blocksMade, blocksReceived, reportsMade, reportsReceived, verificationRequests, feedback, consents] = await Promise.all([
      getDb().user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          displayName: true,
          createdAt: true,
          isVerified: true,
          role: true,
          lastActive: true,
        },
      }),
      getDb().profile.findUnique({
        where: { userId },
        select: {
          bio: true,
          birthDate: true,
          genderIdentity: true,
          orientation: true,
          relationshipType: true,
          interests: true,
          practices: true,
          socialLinks: true,
          photos: true,
          maxDistanceKm: true,
          ageMin: true,
          ageMax: true,
          invisibleMode: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      // E2E public key — RGPD art. 20 (portability): the user owns the key
      // material they need to read their encrypted history. Only the public
      // half is ever stored on the server, so it is safe to export.
      getDb().userKey.findUnique({
        where: { userId },
        select: { publicKey: true, keyCreatedAt: true },
      }),
      getDb().like.findMany({
        where: { likerId: userId },
        select: { likedId: true, createdAt: true },
      }),
      getDb().like.findMany({
        where: { likedId: userId },
        select: { likerId: true, createdAt: true },
      }),
      getDb().match.findMany({
        where: { userA: userId },
        select: { id: true, userB: true, createdAt: true },
      }),
      getDb().match.findMany({
        where: { userB: userId },
        select: { id: true, userA: true, createdAt: true },
      }),
      getDb().conversation.findMany({
        where: { OR: [{ userA: userId }, { userB: userId }] },
        select: { id: true, userA: true, userB: true, createdAt: true, updatedAt: true },
      }),
      getDb().encounter.findMany({
        where: { userA: userId },
        select: { id: true, userB: true, distanceM: true, happenedAt: true },
      }),
      getDb().encounter.findMany({
        where: { userB: userId },
        select: { id: true, userA: true, distanceM: true, happenedAt: true },
      }),
      getDb().block.findMany({
        where: { blockerId: userId },
        select: { blockedId: true, createdAt: true },
      }),
      getDb().block.findMany({
        where: { blockedId: userId },
        select: { blockerId: true, createdAt: true },
      }),
      getDb().report.findMany({
        where: { reporterId: userId },
        select: { reportedId: true, reason: true, status: true, createdAt: true },
      }),
      getDb().report.findMany({
        where: { reportedId: userId },
        select: { reporterId: true, reason: true, status: true, createdAt: true },
      }),
      getDb().verificationRequest.findMany({
        where: { userId },
        select: { status: true, createdAt: true, resolvedAt: true },
      }),
      getDb().feedback.findMany({
        where: { userId },
        select: { category: true, message: true, status: true, createdAt: true },
      }),
      getDb().consent.findMany({
        where: { userId },
        select: { type: true, version: true, given: true, createdAt: true, withdrawnAt: true },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      format: 'Libre_RGPD_Portability_v1',
      user,
      profile,
      // E2E public key (the only key material the server ever sees).
      // Without it the user cannot decrypt their exported ciphertexts
      // elsewhere — this is the "key portability" piece of art. 20.
      e2e: {
        publicKey: userKey?.publicKey ?? null,
        keyCreatedAt: userKey?.keyCreatedAt ?? null,
        note: userKey
          ? 'Clé publique de chiffrement E2E. La clé privée reste dans votre navigateur (IndexedDB) et n\'est jamais exportée par le serveur.'
          : 'Aucune clé E2E enregistrée (compte créé avant l\'activation du chiffrement, ou clés jamais initialisées).',
      },
      social: {
        sentLikes,
        receivedLikes,
        matches: [...matchesAsA, ...matchesAsB],
        conversations,
      },
      encounters: {
        initiated: encountersAsA,
        received: encountersAsB,
      },
      moderation: {
        blocksMade,
        blocksReceived,
        reportsMade,
        reportsReceived,
        verificationRequests,
        feedback,
      },
      privacy: {
        consents,
      },
      // Note: messages are E2E encrypted and cannot be exported in readable form
      messageContentDisclaimer: 'Le contenu de vos messages est chiffré de bout en bout (E2E). Il ne peut être exporté en clair car seul vous et votre correspondant possédez les clés de déchiffrement. Les identifiants de conversation sont inclus dans la section "social" ci-dessus, mais le contenu (table "messages", colonne "content") reste un blob chiffré illisible sans votre clé privée.',
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="libre_data_export_${userId.slice(0, 8)}.json"`,
      },
    });
  } catch (error) {
    console.error('Data export error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'export des données' },
      { status: 500 },
    );
  }
}