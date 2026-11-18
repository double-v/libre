import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { chargerGrappes } from '@/lib/fraude/indices-admin';

const PAR_PAGE = 20;
const FILTRES = ['tous', 'doublons', 'douteux', 'a_surveiller'] as const;

/**
 * Page Indices (spec 011, US2) : les comptes porteurs d'indices non
 * tranchés, regroupés en grappes de comptes liés. Les compteurs portent sur
 * toutes les grappes, la liste sur le filtre et la page demandés.
 */
export async function GET(request: NextRequest) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  const params = request.nextUrl.searchParams;
  const filtre = FILTRES.find((f) => f === params.get('filtre')) ?? 'tous';
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);

  try {
    const grappes = await chargerGrappes();
    const compteurs = {
      tous: grappes.length,
      doublons: grappes.filter((g) => g.doublon).length,
      douteux: grappes.filter((g) => g.niveau === 'douteux').length,
      a_surveiller: grappes.filter((g) => g.niveau === 'a_surveiller').length,
    };
    const filtrees = grappes.filter((g) =>
      filtre === 'tous' ? true : filtre === 'doublons' ? g.doublon !== null : g.niveau === filtre,
    );
    return NextResponse.json({
      grappes: filtrees.slice((page - 1) * PAR_PAGE, page * PAR_PAGE),
      total: filtrees.length,
      parPage: PAR_PAGE,
      compteurs,
    });
  } catch (error) {
    console.error('indices.lecture.failed', error instanceof Error ? error.message.slice(0, 80) : 'unknown');
    return NextResponse.json({ error: 'Impossible de charger les indices' }, { status: 500 });
  }
}
