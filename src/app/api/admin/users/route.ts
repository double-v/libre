import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { masquerEmail } from '@/lib/masquer-email';
import { chargerFiabilite } from '@/lib/fraude/fiabilite-admin';
import { RANG_NIVEAU, type NiveauFiabilite } from '@/lib/fraude/fiabilite';

const NIVEAUX: ReadonlySet<string> = new Set(['fiable', 'a_surveiller', 'douteux']);
const TRIS: ReadonlySet<string> = new Set(['recent', 'fiabilite']);

export async function GET(request: NextRequest) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const perPage = Math.min(50, Math.max(1, Number(searchParams.get('perPage') ?? '20')));
  const search = searchParams.get('search') ?? '';
  // Spec 010, US3 : filtre et tri par indice de fiabilité.
  const niveau = searchParams.get('niveau');
  const tri = searchParams.get('tri') ?? 'recent';
  if ((niveau !== null && !NIVEAUX.has(niveau)) || !TRIS.has(tri)) {
    return NextResponse.json({ error: 'Paramètre de filtre inconnu' }, { status: 400 });
  }

  const fiabilite = await chargerFiabilite();
  const niveauDe = (id: string): NiveauFiabilite => fiabilite.get(id)?.niveau ?? 'fiable';
  const signales = [...fiabilite.keys()];
  // « Fiable » = aucun signal, ou des signaux qui ne pèsent plus : on exclut
  // les autres plutôt que d'énumérer toute la base.
  const filtreNiveau =
    niveau === null
      ? {}
      : niveau === 'fiable'
        ? { id: { notIn: signales.filter((id) => niveauDe(id) !== 'fiable') } }
        : { id: { in: signales.filter((id) => niveauDe(id) === niveau) } };

  const recherche = search
    ? {
        OR: [
          { displayName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};
  const where = { AND: [recherche, filtreNiveau] };

  // Tri par fiabilité : calculé en mémoire, donc on ordonne tous les
  // identifiants retenus puis on pagine. À l'échelle de Libre, c'est quelques
  // centaines d'identifiants ; au-delà, il faudra une colonne dérivée.
  let idsPage: string[] | null = null;
  let totalTri: number | null = null;
  if (tri === 'fiabilite') {
    const tous = await getDb().user.findMany({ where, select: { id: true, createdAt: true } });
    tous.sort(
      (a, b) =>
        RANG_NIVEAU[niveauDe(b.id)] - RANG_NIVEAU[niveauDe(a.id)] ||
        (fiabilite.get(b.id)?.signauxRecents ?? 0) - (fiabilite.get(a.id)?.signauxRecents ?? 0) ||
        b.createdAt.getTime() - a.createdAt.getTime(),
    );
    totalTri = tous.length;
    idsPage = tous.slice((page - 1) * perPage, page * perPage).map((u) => u.id);
  }

  const [lignes, total] = await Promise.all([
    getDb().user.findMany({
      where: idsPage ? { id: { in: idsPage } } : where,
      select: {
        id: true,
        displayName: true,
        email: true,
        role: true,
        isBanned: true,
        isVerified: true,
        createdAt: true,
        lastActive: true,
        profile: { select: { photos: true } },
      },
      orderBy: { createdAt: 'desc' },
      ...(idsPage ? {} : { skip: (page - 1) * perPage, take: perPage }),
    }),
    totalTri ?? getDb().user.count({ where }),
  ]);
  const users = idsPage ? idsPage.map((id) => lignes.find((u) => u.id === id)!).filter(Boolean) : lignes;

  return NextResponse.json({
    // L'adresse complète ne quitte pas le serveur pour une liste (#423) ; la
    // recherche, elle, s'est faite en base sur l'adresse entière.
    users: users.map(({ email, ...u }) => ({
      ...u,
      emailMasque: masquerEmail(email),
      photoCount: (u.profile?.photos as string[] | undefined)?.length ?? 0,
      niveau: niveauDe(u.id),
      signauxRecents: fiabilite.get(u.id)?.signauxRecents ?? 0,
      profile: undefined,
    })),
    total,
    page,
    perPage,
  });
}