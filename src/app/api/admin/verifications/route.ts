import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { masquerEmail } from '@/lib/masquer-email';
import { photoUrl } from '@/lib/photos';
import { texteAncienGeste } from '@/lib/verification/ancien-geste';
import { lireMotif } from '@/lib/verification/motifs';

const STATUTS = new Set(['pending', 'approved', 'rejected']);

export async function GET(request: NextRequest) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  const demande = request.nextUrl.searchParams.get('status') ?? 'pending';
  const status = STATUTS.has(demande) ? demande : 'pending';
  const db = getDb();

  const verifications = await db.verificationRequest.findMany({
    where: { status },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
          // File comparée (#436) : le selfie se juge à côté des photos du profil.
          profile: { select: { photos: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Refus précédent de chaque membre (FR-006, à partir de la 2e tentative) :
  // une seule requête pour toute la file.
  const avecPassé = verifications.filter((v) => v.tentative > 1).map((v) => v.userId);
  const refus = avecPassé.length
    ? await db.verificationRequest.findMany({
        where: { userId: { in: avecPassé }, status: 'rejected' },
        orderBy: { resolvedAt: 'desc' },
        select: { id: true, userId: true, rejectReason: true, resolvedAt: true, createdAt: true },
      })
    : [];

  // Même minimisation que la liste des membres (#423) : l'adresse entière n'a
  // pas sa place dans une file. Les clés de motif sont traduites ici :
  // l'écran affiche ce que le membre a lu, pas un identifiant interne.
  return NextResponse.json({
    verifications: verifications.map(({ user: { email, profile, ...user }, challenge, rejectReason, ...v }) => {
      const precedent = v.tentative > 1
        ? refus.find((r) => r.userId === v.userId && r.id !== v.id && r.createdAt < v.createdAt)
        : undefined;
      return {
        id: v.id,
        selfieUrl: v.selfieUrl,
        status: v.status,
        createdAt: v.createdAt,
        codeAttendu: v.codeAttendu,
        codeLu: v.codeLu,
        tentative: v.tentative,
        sansDonneesAppareil: v.sansDonneesAppareil,
        ancienGeste: v.codeAttendu ? null : texteAncienGeste(challenge),
        motif: lireMotif(rejectReason)?.texte ?? null,
        refusPrecedent: precedent
          ? { motif: lireMotif(precedent.rejectReason)?.libelle ?? null, at: precedent.resolvedAt }
          : null,
        user: { ...user, emailMasque: masquerEmail(email), photos: (profile?.photos ?? []).map(photoUrl) },
      };
    }),
  });
}
