import { NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { CHAMPS_ADMIN, ERREUR_500, lireJson, tracer, validerContenu } from '@/lib/journal/serveur';

type Ctx = { params: Promise<{ id: string }> };

const introuvable = () => NextResponse.json({ error: 'Publication introuvable' }, { status: 404 });

/** Une publication du journal, côté admin (spec 007, US2). */
export async function GET(_request: Request, { params }: Ctx) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  const { id } = await params;
  try {
    const post = await getDb().journalPost.findUnique({ where: { id }, select: CHAMPS_ADMIN });
    return post ? NextResponse.json({ post }, { status: 200 }) : introuvable();
  } catch (error) {
    console.error('journal.read.failed', error instanceof Error ? error.message : 'unknown');
    return ERREUR_500();
  }
}

/**
 * Enregistrer un **brouillon**. Une publication publiée refuse (409) : la
 * modifier, c'est la republier, donc repasser les garde-fous (US2 scénario 5)
 * — une édition en place contournerait le contrôle.
 */
export async function PUT(request: Request, { params }: Ctx) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  const contenu = validerContenu(await lireJson(request));
  if (contenu instanceof NextResponse) return contenu;
  const { id } = await params;
  try {
    const actuel = await getDb().journalPost.findUnique({ where: { id }, select: { statut: true } });
    if (!actuel) return introuvable();
    if (actuel.statut === 'publiee') {
      return NextResponse.json({ error: 'Publication en ligne : sa modification passe par « Publier ».' }, { status: 409 });
    }
    const post = await getDb().journalPost.update({ where: { id }, data: contenu, select: CHAMPS_ADMIN });
    return NextResponse.json({ post }, { status: 200 });
  } catch (error) {
    console.error('journal.save.failed', error instanceof Error ? error.message : 'unknown');
    return ERREUR_500();
  }
}

/**
 * Supprimer un brouillon **jamais publié**. Ce qui a été en ligne se dépublie
 * seulement : son adresse a pu être partagée ou indexée, elle reste réservée.
 */
export async function DELETE(_request: Request, { params }: Ctx) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  const { id } = await params;
  try {
    const actuel = await getDb().journalPost.findUnique({ where: { id }, select: { publieeAt: true } });
    if (!actuel) return introuvable();
    if (actuel.publieeAt) {
      return NextResponse.json({ error: 'Déjà publiée une fois : elle se dépublie, elle ne se supprime pas.' }, { status: 409 });
    }
    await getDb().journalPost.delete({ where: { id } });
    await tracer(adminResult.userId, 'DELETE_DRAFT', `post:${id}`);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('journal.delete.failed', error instanceof Error ? error.message : 'unknown');
    return ERREUR_500();
  }
}
