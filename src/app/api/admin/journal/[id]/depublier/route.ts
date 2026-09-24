import { NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { CHAMPS_ADMIN, ERREUR_500, revaliderJournal, tracer } from '@/lib/journal/serveur';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Dépublier (spec 007, US2) : la publication quitte la page publique et
 * redevient un brouillon. Slug et date d'origine sont gardés — l'adresse a pu
 * être partagée, elle reste réservée à cette publication.
 */
export async function POST(_request: Request, { params }: Ctx) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  const { id } = await params;
  try {
    const actuel = await getDb().journalPost.findUnique({ where: { id }, select: { statut: true, slug: true } });
    if (!actuel) return NextResponse.json({ error: 'Publication introuvable' }, { status: 404 });
    if (actuel.statut !== 'publiee') return NextResponse.json({ error: 'Cette publication n’est pas en ligne.' }, { status: 409 });
    const post = await getDb().journalPost.update({ where: { id }, data: { statut: 'brouillon' }, select: CHAMPS_ADMIN });
    await tracer(adminResult.userId, 'UNPUBLISH_POST', `post:${id}`);
    revaliderJournal(actuel.slug);
    return NextResponse.json({ post }, { status: 200 });
  } catch (error) {
    console.error('journal.unpublish.failed', error instanceof Error ? error.message : 'unknown');
    return ERREUR_500();
  }
}
