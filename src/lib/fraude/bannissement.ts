import { getDb } from '@/lib/db';

/**
 * Retenir les empreintes d'un compte banni (spec 006, FR-018) : un faux
 * profil banni revient avec les mêmes photos sur un compte neuf. Les
 * empreintes sont copiées sans clé étrangère — elles survivent à la
 * suppression du compte — et partent après un an (`empreintesBannies`).
 *
 * Appelé par tous les chemins de bannissement. Best-effort : un échec ne
 * doit pas annuler le bannissement lui-même.
 */
export async function retenirEmpreintesBannies(userId: string): Promise<number> {
  try {
    const db = getDb();
    const empreintes = await db.photoFingerprint.findMany({ where: { userId }, select: { hash: true } });
    if (empreintes.length === 0) return 0;
    const { count } = await db.bannedPhotoFingerprint.createMany({
      data: empreintes.map((e) => ({ hash: e.hash, bannedUserId: userId })),
    });
    return count;
  } catch (err) {
    console.warn('fraude.bannissement.failed', { message: (err as Error)?.message?.slice(0, 80) });
    return 0;
  }
}
