import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { refusOrigine } from '@/lib/securite/origine';
import { lireFiche } from '@/lib/moderation/fiche';
import { estUuid, supprimerCompte } from '@/lib/moderation/gestes';
import { CODES_MOTIFS_SANCTION, type MotifSanction } from '@/lib/moderation/reperes';

const SANS_CACHE = { 'Cache-Control': 'private, no-store' };

/** GET /api/admin/membres/:id — la fiche d'un membre (spec 012, US4). */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  const { id } = await params;

  try {
    const fiche = await lireFiche(id);
    if (!fiche) return NextResponse.json({ error: 'Membre introuvable.' }, { status: 404, headers: SANS_CACHE });
    return NextResponse.json(fiche, { headers: SANS_CACHE });
  } catch (error) {
    console.error('admin.membres.fiche.failed', error instanceof Error ? error.message.slice(0, 120) : 'unknown');
    return NextResponse.json({ error: 'La fiche n’a pas pu être chargée. Réessaie.' }, { status: 500, headers: SANS_CACHE });
  }
}

/**
 * DELETE /api/admin/membres/:id — supprimer un compte (FR-S11, menace M12).
 *
 * Jamais par lot : un geste immédiat, avec la **ressaisie exacte** du pseudo
 * et un motif de la liste fermée. Ordre des contrôles : garde admin (404 pour
 * tout autre), puis origine (403), puis contenu (400). Un compte se supprime
 * lui-même par Paramètres, pas ici.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  const refus = refusOrigine(request);
  if (refus) return refus;
  const { id } = await params;

  const corps = (await request.json().catch(() => null)) as { pseudo?: unknown; motif?: unknown } | null;
  const motif = CODES_MOTIFS_SANCTION.find((m) => m === corps?.motif) as MotifSanction | undefined;
  if (typeof corps?.pseudo !== 'string' || !motif) {
    return NextResponse.json({ error: 'Ressaisis le pseudo et choisis un motif dans la liste.' }, { status: 400 });
  }
  if (id === adminResult.userId) {
    return NextResponse.json({ error: 'On ne supprime pas son propre compte ici.' }, { status: 400 });
  }
  if (!estUuid(id)) return NextResponse.json({ error: 'Membre introuvable.' }, { status: 404 });

  try {
    const cible = await getDb().user.findUnique({ where: { id }, select: { displayName: true, role: true } });
    if (!cible) return NextResponse.json({ error: 'Membre introuvable.' }, { status: 404 });
    if (cible.role === 'ADMIN') {
      return NextResponse.json({ error: 'Un compte admin ne se supprime pas ici.' }, { status: 400 });
    }
    if (corps.pseudo !== cible.displayName) {
      return NextResponse.json({ error: 'Le pseudo ressaisi ne correspond pas : rien n’a été supprimé.' }, { status: 400 });
    }
    if ((await supprimerCompte(adminResult.userId, id, motif)) === 'introuvable') {
      return NextResponse.json({ error: 'Membre introuvable.' }, { status: 404 });
    }
    return NextResponse.json({ supprime: id });
  } catch (error) {
    console.error('admin.membres.suppression.failed', error instanceof Error ? error.message.slice(0, 120) : 'unknown');
    return NextResponse.json({ error: 'La suppression n’a pas abouti. Réessaie.' }, { status: 500 });
  }
}
