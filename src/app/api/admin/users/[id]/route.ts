import { NextRequest, NextResponse } from 'next/server';
import { photoSensitivityMap } from '@/lib/photo-veil';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { adminBanSchema } from '@/lib/validators';
import { changerBannissement, estUuid } from '@/lib/moderation/gestes';
import { estMotifSanction } from '@/lib/moderation/reperes';
import { niveauFiabilite, signauxRecents, TYPES_CONTEXTE } from '@/lib/fraude/fiabilite';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  const { id } = await params;

  const user = await getDb().user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      isBanned: true,
      isVerified: true,
      // Mise en retrait (spec 006) : la fiche affiche l'état et propose de la lever.
      retraitAt: true,
      createdAt: true,
      lastActive: true,
      profile: {
        select: {
          bio: true,
          birthDate: true,
          genderIdentity: true,
          orientation: true,
          relationshipType: true,
          interests: true,
          practices: true,
          photos: true,
          invisibleMode: true,
        },
      },
      reportsReceived: {
        where: { status: 'pending' },
        take: 10,
        orderBy: { createdAt: 'desc' },
        // description + reporter sont consommés par la page de détail : sans
        // la relation, r.reporter.displayName jetait un TypeError dès qu'un
        // utilisateur avait un signalement en attente — soit exactement le
        // cas où l'admin ouvre la fiche (#321).
        select: {
          id: true,
          reason: true,
          description: true,
          createdAt: true,
          reporter: { select: { id: true, displayName: true } },
        },
      },
      verificationRequests: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, status: true, createdAt: true, selfieUrl: true },
      },
      // Spec 010 : de quoi expliquer le niveau, signal par signal (FR-015).
      verifInviteeAt: true,
      profileReview: { select: { decidedAt: true } },
      profileSignals: {
        orderBy: { createdAt: 'desc' },
        select: { type: true, force: true, createdAt: true, extrait: true, autreUserId: true },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
  }

  // Classification des photos (#330) : la galerie de modération doit afficher
  // l'état courant, sinon l'admin ne sait pas ce qu'il a déjà classé.
  const photoSensitivity = await photoSensitivityMap(user.profile?.photos ?? []);

  // Indice de fiabilité (spec 010, US3) : le niveau et chaque indice qui y
  // pèse. Pas de pondération cachée ; les indices de contexte disent qu'ils
  // peuvent être légitimes.
  const { profileSignals, profileReview, verifInviteeAt, ...reste } = user;
  const recents = signauxRecents(profileSignals, profileReview?.decidedAt ?? null);
  const fiabilite = {
    niveau: niveauFiabilite(recents, user.isVerified),
    invitation: verifInviteeAt ? { depuis: verifInviteeAt } : null,
    indices: recents.map((sig) => ({
      type: sig.type,
      force: sig.force,
      date: sig.createdAt,
      extrait: sig.extrait,
      autreUserId: sig.autreUserId,
      legitimePossible: TYPES_CONTEXTE.has(sig.type),
    })),
  };

  return NextResponse.json({ user: reste, photoSensitivity, fiabilite });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = adminBanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation échouée', details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { banned, reason } = parsed.data;
  if (banned) {
    // FR-022 : motif de la liste fermée. Et on ne bannit ni soi-même ni un
    // autre admin depuis ici : ce serait se fermer la porte, ou la fermer à
    // un collègue, d'un clic.
    if (!estMotifSanction(reason)) {
      return NextResponse.json({ error: 'Choisis un motif de bannissement dans la liste.' }, { status: 400 });
    }
    if (id === adminResult.userId) return NextResponse.json({ error: 'On ne se bannit pas soi-même.' }, { status: 400 });
    if (estUuid(id) && (await getDb().user.findUnique({ where: { id }, select: { role: true } }))?.role === 'ADMIN') {
      return NextResponse.json({ error: 'Un compte admin ne se bannit pas ici.' }, { status: 400 });
    }
  }
  // Effet et journal dans `changerBannissement` (spec 012, T003).
  if ((await changerBannissement(adminResult.userId, id, banned, reason ?? null)) === 'introuvable') {
    return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
  }
  return NextResponse.json({ user: { id, isBanned: banned } });
}

// La suppression d'un compte passe par `DELETE /api/admin/membres/[id]`
// (spec 012, FR-S11) : ressaisie du pseudo, motif de la liste fermée,
// contrôle d'origine. L'ancienne suppression sans confirmation est retirée.
