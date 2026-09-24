import { NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { CHAMPS_ADMIN, ERREUR_500, lireJson, validerContenu } from '@/lib/journal/serveur';

/**
 * Journal « Où en est Libre » (spec 007, US2) — liste admin et création d'un
 * brouillon. Un brouillon n'est jamais servi publiquement : aucun contrôle
 * éditorial ici, il a lieu à la publication.
 */
export async function GET() {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  try {
    const posts = await getDb().journalPost.findMany({ select: CHAMPS_ADMIN, orderBy: { modifieeAt: 'desc' } });
    return NextResponse.json({ posts }, { status: 200 });
  } catch (error) {
    console.error('journal.list.failed', error instanceof Error ? error.message : 'unknown');
    return ERREUR_500();
  }
}

export async function POST(request: Request) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  const contenu = validerContenu(await lireJson(request));
  if (contenu instanceof NextResponse) return contenu;
  try {
    const post = await getDb().journalPost.create({
      data: { ...contenu, statut: 'brouillon', auteurId: adminResult.userId },
    });
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('journal.create.failed', error instanceof Error ? error.message : 'unknown');
    return ERREUR_500();
  }
}
