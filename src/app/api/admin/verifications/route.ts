import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { masquerEmail } from '@/lib/masquer-email';
import { photoUrl } from '@/lib/photos';
import { geste } from '@/lib/verification/gestes';
import { MOTIFS_REFUS, type MotifRefus } from '@/lib/verification/motifs';

export async function GET(request: NextRequest) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status') ?? 'pending';

  const verifications = await getDb().verificationRequest.findMany({
    where: { status },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
          // File comparée (#436) : le selfie se juge à côté des photos du profil.
          profile: { select: { photos: true } },
          _count: { select: { verificationRequests: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Même minimisation que la liste des membres (#423) : la file de
  // vérification est une liste, l'adresse entière n'y a pas sa place.
  // Codes de geste et de motif traduits ici : l'écran affiche ce que le
  // membre a lu, pas un identifiant interne.
  return NextResponse.json({
    verifications: verifications.map(({ user: { email, profile, _count, ...user }, challenge, rejectReason, ...v }) => ({
      ...v,
      geste: (challenge && geste(challenge)?.texte) ?? null,
      motif: rejectReason && rejectReason in MOTIFS_REFUS ? MOTIFS_REFUS[rejectReason as MotifRefus] : null,
      tentatives: _count.verificationRequests,
      user: { ...user, emailMasque: masquerEmail(email), photos: (profile?.photos ?? []).map(photoUrl) },
    })),
  });
}
