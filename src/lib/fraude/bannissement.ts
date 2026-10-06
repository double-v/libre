import { getDb } from '@/lib/db';
import { hmacIdentite } from './empreinte-identite';

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
  // Spec 010 : appareil et e-mail aussi, pour le banni qui revient avec de
  // nouvelles photos. Indépendant : une panne d'un volet n'empêche pas l'autre.
  await retenirIdentiteBannie(userId);
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

/**
 * Empreintes HMAC de l'appareil et de l'e-mail normalisé (spec 010, FR-002) :
 * jamais la valeur en clair. Purgées après un an (`empreintesIdentiteBannies`).
 */
export async function retenirIdentiteBannie(userId: string): Promise<number> {
  try {
    const db = getDb();
    const u = await db.user.findUnique({ where: { id: userId }, select: { deviceId: true, normalizedEmail: true } });
    if (!u) return 0;
    const data = [
      { kind: 'appareil', hash: hmacIdentite('appareil', u.deviceId) },
      { kind: 'email', hash: hmacIdentite('email', u.normalizedEmail) },
    ]
      .filter((e): e is { kind: string; hash: string } => e.hash !== null)
      .map((e) => ({ ...e, bannedUserId: userId }));
    if (data.length === 0) return 0;
    const { count } = await db.bannedIdentityFingerprint.createMany({ data });
    return count;
  } catch (err) {
    console.warn('fraude.bannissement.identite.failed', { message: (err as Error)?.message?.slice(0, 80) });
    return 0;
  }
}
