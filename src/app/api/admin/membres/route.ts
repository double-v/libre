import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { decoderCurseur, estFiltre, estTri } from '@/lib/moderation/cas';
import { compterCas, listerMembres } from '@/lib/moderation/membres';

const RECHERCHE_MAX = 100;
const SANS_CACHE = { 'Cache-Control': 'private, no-store' };

/**
 * GET /api/admin/membres — liste du hub Membres (spec 012, US3, contrats/api.md).
 *
 * Paramètres : `filtre`, `tri`, `q`, `curseur`. Tout paramètre inconnu ou mal
 * formé est refusé (400), jamais corrigé en silence : un curseur forgé ne doit
 * pas devenir « la première page » (FR-S14). Les compteurs ne sont calculés
 * qu'avec la première page : les suivantes n'en ont pas besoin, et chaque
 * requête compte sur l'offre Hobby.
 */
export async function GET(request: NextRequest) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  const sp = request.nextUrl.searchParams;
  const filtre = sp.get('filtre') ?? 'atraiter';
  const tri = sp.get('tri') ?? 'urgence';
  const q = (sp.get('q') ?? '').trim();
  const brut = sp.get('curseur');
  if (!estFiltre(filtre) || !estTri(tri)) {
    return NextResponse.json({ error: 'Filtre ou tri inconnu.' }, { status: 400, headers: SANS_CACHE });
  }
  if (q.length > RECHERCHE_MAX) {
    return NextResponse.json({ error: 'La recherche est trop longue.' }, { status: 400, headers: SANS_CACHE });
  }
  const curseur = brut === null ? null : decoderCurseur(brut, tri);
  if (brut !== null && !curseur) {
    return NextResponse.json({ error: 'Curseur invalide : recharge la liste.' }, { status: 400, headers: SANS_CACHE });
  }

  try {
    const [page, compteurs] = await Promise.all([
      listerMembres({ filtre, tri, q, curseur }),
      curseur ? Promise.resolve(null) : compterCas(),
    ]);
    return NextResponse.json({ ...page, compteurs }, { headers: SANS_CACHE });
  } catch (error) {
    console.error('admin.membres.liste.failed', error instanceof Error ? error.message.slice(0, 120) : 'unknown');
    return NextResponse.json({ error: 'La liste n’a pas pu être chargée. Réessaie.' }, { status: 500, headers: SANS_CACHE });
  }
}
