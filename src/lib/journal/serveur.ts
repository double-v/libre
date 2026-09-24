import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db';

/**
 * Briques serveur partagées par les routes admin du journal (spec 007).
 * Module serveur uniquement.
 */

export const TITRE_MAX = 120;
export const CORPS_MAX = 20_000;

/** Ce que l'admin relit d'une publication — jamais `auteurId`, inutile à l'écran. */
export const CHAMPS_ADMIN = {
  id: true, slug: true, titre: true, corps: true, statut: true, publieeAt: true, modifieeAt: true,
} as const;

export type Contenu = { titre: string; corps: string };

/**
 * Titre et corps nettoyés et bornés, ou la réponse 400 à renvoyer. Le corps
 * est `trim`é en fin seulement : une indentation de liste en tête compte.
 */
export function validerContenu(body: unknown): Contenu | NextResponse {
  const b = (body ?? {}) as Record<string, unknown>;
  const titre = typeof b.titre === 'string' ? b.titre.trim() : '';
  const corps = typeof b.corps === 'string' ? b.corps.replace(/\s+$/, '') : '';
  if (!titre || titre.length > TITRE_MAX || !corps.trim() || corps.length > CORPS_MAX) {
    return NextResponse.json(
      { error: `Titre (1 à ${TITRE_MAX} caractères) et texte (1 à ${CORPS_MAX} caractères) sont requis.` },
      { status: 400 },
    );
  }
  return { titre, corps };
}

export async function lireJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * Trace au journal de modération. Cible = l'admin lui-même, comme
 * `SET_FEATURES` : une publication n'a pas de membre pour sujet. Jamais
 * d'extrait du texte, seulement l'identifiant et les règles levées.
 */
export async function tracer(adminId: string, action: string, reason: string): Promise<void> {
  await getDb().moderationLog.create({ data: { adminId, targetUserId: adminId, action, reason } });
}

/**
 * Régénère les pages publiques touchées. Best-effort : l'écriture est déjà
 * faite, et le `revalidate` horaire des pages rattrapera un échec.
 */
export function revaliderJournal(slug: string | null | undefined): void {
  try {
    revalidatePath('/journal');
    if (slug) revalidatePath(`/journal/${slug}`);
    revalidatePath('/sitemap.xml');
  } catch (err) {
    console.error('journal.revalidate.failed', err instanceof Error ? err.message : 'unknown');
  }
}

export const ERREUR_500 = () =>
  NextResponse.json({ error: 'Une erreur est survenue, veuillez réessayer' }, { status: 500 });
