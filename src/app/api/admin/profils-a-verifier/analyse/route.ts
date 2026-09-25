import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { lirePhoto, isR2Configured } from '@/lib/r2';
import { analyserPhoto, analyserTexteProfil } from '@/lib/fraude/analyse';

const LOT = 10;

/** Dix profils × six photos × ≈ 0,3 s : large sous cette limite. */
export const maxDuration = 60;

/**
 * Rattrapage (spec 006, FR-011) : analyser les profils écrits avant la
 * détection — pseudo, bio et photos relues depuis R2 — par lots de dix.
 * Pas de cron (plan Vercel, #427) : l'admin relance avec le curseur rendu,
 * et peut reprendre plus tard là où il s'est arrêté. Rejouer ne coûte rien :
 * un signal déjà vu ne se recrée pas.
 */
export async function POST(request: NextRequest) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  const body = (await request.json().catch(() => ({}))) as { apres?: unknown };
  const apres = typeof body.apres === 'string' ? body.apres : undefined;

  const comptes = await getDb().user.findMany({
    where: { isBanned: false, profile: { isNot: null }, ...(apres ? { id: { gt: apres } } : {}) },
    select: { id: true, displayName: true, profile: { select: { bio: true, photos: true } } },
    orderBy: { id: 'asc' },
    take: LOT,
  });

  const stockage = isR2Configured();
  let photos = 0;
  let echecs = 0;
  for (const c of comptes) {
    await analyserTexteProfil({ userId: c.id, displayName: c.displayName, bio: c.profile?.bio ?? '' });
    if (!stockage) continue;
    for (const key of c.profile?.photos ?? []) {
      try {
        await analyserPhoto({ userId: c.id, photoKey: key, buffer: await lirePhoto(key) });
        photos++;
      } catch {
        // Une photo absente de R2 ne bloque pas le lot.
        echecs++;
      }
    }
  }

  return NextResponse.json({
    profils: comptes.length,
    photos,
    echecs,
    // Un lot plein laisse supposer qu'il en reste ; un lot court clôt le tour.
    suivant: comptes.length === LOT ? comptes[comptes.length - 1].id : null,
  });
}
