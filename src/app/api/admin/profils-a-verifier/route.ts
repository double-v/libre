import { NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { masquerEmail } from '@/lib/masquer-email';
import { photoUrl } from '@/lib/photos';
import { lireFile } from '@/lib/fraude/file';

/**
 * File « Profils à vérifier » (spec 006, US4). Un profil y entre sur un signal
 * fort, deux signaux, ou un signalement « faux profil », postérieurs à la
 * dernière décision (`dansLaFile`). Ordre : signaux forts d'abord, puis le
 * plus récent. E-mail masqué : la liste sert à reconnaître, pas à contacter.
 */
export async function GET() {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  const comptes = await lireFile();

  const profils = comptes
    .map((c) => {
      const recents = c.profileSignals.filter((s) => !c.profileReview || s.createdAt > c.profileReview.decidedAt);
      return {
        userId: c.id,
        displayName: c.displayName,
        email: masquerEmail(c.email),
        inscritLe: c.createdAt,
        enRetrait: c.retraitAt !== null,
        bio: c.profile?.bio ?? '',
        photos: (c.profile?.photos ?? []).map(photoUrl),
        derniereDecision: c.profileReview,
        forts: recents.filter((s) => s.force === 'fort').length,
        dernierSignal: recents[0]?.createdAt ?? null,
        signaux: c.profileSignals.map((s) => ({
          ...s,
          photo: s.photoKey ? photoUrl(s.photoKey) : null,
          // Un signal déjà vu avant la dernière décision est montré, grisé.
          nouveau: !c.profileReview || s.createdAt > c.profileReview.decidedAt,
        })),
      };
    })
    .sort((a, b) => b.forts - a.forts || (b.dernierSignal?.getTime() ?? 0) - (a.dernierSignal?.getTime() ?? 0));

  return NextResponse.json({ profils });
}
