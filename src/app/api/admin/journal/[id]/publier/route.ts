import { NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { verifierPublication } from '@/lib/journal/garde-fous';
import { slugDepuisTitre, slugLibre } from '@/lib/journal/slug';
import { CHAMPS_ADMIN, ERREUR_500, lireJson, revaliderJournal, tracer, validerContenu } from '@/lib/journal/serveur';

type Ctx = { params: Promise<{ id: string }> };

const MESSAGES = {
  bloquante: 'Le texte contient une information qui ne se publie jamais (e-mail ou téléphone). Retire-la pour publier.',
  'non-levee': 'Des alertes restent à lever ou à corriger.',
  'regles-non-relues': 'Coche « J’ai relu les règles » pour publier.',
} as const;

/**
 * Publier (ou republier) une nouvelle du journal (spec 007, US2 + US3).
 *
 * **Seule porte vers la page publique.** Le serveur recontrôle le titre et le
 * corps **reçus** — ceux qu'il va écrire — avec `verifierPublication` : une
 * alerte bloquante, une levable non levée ou la case des règles absente →
 * 422, rien n'est écrit. Le slug et la date de première publication ne sont
 * fixés qu'une fois ; une republication les garde.
 */
export async function POST(request: Request, { params }: Ctx) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  const body = (await lireJson(request)) as Record<string, unknown> | null;
  const contenu = validerContenu(body);
  if (contenu instanceof NextResponse) return contenu;
  const { id } = await params;

  const verdict = verifierPublication({
    ...contenu,
    levees: Array.isArray(body?.levees) ? body.levees.filter((l): l is string => typeof l === 'string') : [],
    reglesRelues: body?.reglesRelues === true,
  });
  if (!verdict.ok) {
    return NextResponse.json({ error: MESSAGES[verdict.motif], motif: verdict.motif, alertes: verdict.alertes }, { status: 422 });
  }

  try {
    const db = getDb();
    const actuel = await db.journalPost.findUnique({ where: { id }, select: { statut: true, slug: true, publieeAt: true } });
    if (!actuel) return NextResponse.json({ error: 'Publication introuvable' }, { status: 404 });

    const slug = actuel.slug ?? (await slugLibre(slugDepuisTitre(contenu.titre), async (s) =>
      Boolean(await db.journalPost.findUnique({ where: { slug: s }, select: { id: true } }))));
    const post = await db.journalPost.update({
      where: { id },
      data: {
        ...contenu,
        statut: 'publiee',
        ...(actuel.slug ? {} : { slug }),
        ...(actuel.publieeAt ? {} : { publieeAt: new Date() }),
      },
      select: CHAMPS_ADMIN,
    });

    const levees = verdict.reglesLevees.length ? ` ; levees: ${verdict.reglesLevees.join(',')}` : '';
    await tracer(adminResult.userId, actuel.statut === 'publiee' ? 'UPDATE_POST' : 'PUBLISH_POST', `post:${id}${levees}`);
    revaliderJournal(slug);
    return NextResponse.json({ post }, { status: 200 });
  } catch (error) {
    console.error('journal.publish.failed', error instanceof Error ? error.message : 'unknown');
    return ERREUR_500();
  }
}
