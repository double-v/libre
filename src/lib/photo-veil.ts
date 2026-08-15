/**
 * Quelles photos arrivent voilées pour ce lecteur (#330).
 *
 * Le composant `SensitivePhoto` ne devine rien : il pose le voile exactement là
 * où le proxy servira le dérivé flouté. Cette liste est donc calculée **côté
 * serveur**, avec la même fonction de décision que `/api/photos/[key]` — deux
 * logiques parallèles finiraient par diverger, et la divergence se verrait sous
 * la forme d'un bouton « Voir » sur une photo déjà nette, ou pire, d'une photo
 * nette sans bouton.
 *
 * On expose les clés voilées et non la classification elle-même : savoir qu'une
 * photo est floutée suffit à l'afficher. Le niveau exact (suggestive/explicit)
 * n'est renvoyé qu'à son propriétaire, qui a besoin de savoir comment sa photo
 * apparaît aux autres.
 */
import { getDb } from '@/lib/db';
import { canSeeOriginal } from '@/lib/photo-sensitivity';

interface VeilContext {
  keys: string[];
  viewerThreshold: string | null | undefined;
  isOwner: boolean;
  isAdmin: boolean;
}

/**
 * Sous-ensemble de `keys` que ce lecteur recevra flouté.
 *
 * Une seule requête pour tout le lot : le feed appelle avec les photos de
 * vingt profils d'un coup, une requête par photo serait un N+1 sur le chemin
 * le plus chaud de l'app.
 */
export async function veiledPhotoKeys(ctx: VeilContext): Promise<string[]> {
  if (ctx.keys.length === 0) return [];
  // Le propriétaire et l'admin voient toujours l'original : inutile d'aller en
  // base pour l'apprendre.
  if (ctx.isOwner || ctx.isAdmin) return [];

  const rows = await getDb().photoModeration.findMany({
    where: { key: { in: ctx.keys } },
    select: { key: true, sensitivity: true },
  });

  return rows
    .filter((row) => !canSeeOriginal({
      level: row.sensitivity,
      viewerThreshold: ctx.viewerThreshold,
      isOwner: false,
      isAdmin: false,
      reveal: false,
    }))
    .map((row) => row.key);
}

/**
 * Classification des photos d'un profil, pour son propriétaire ou pour la
 * modération : ici le **niveau** compte, pas seulement le fait d'être voilé.
 */
export async function photoSensitivityMap(keys: string[]): Promise<Record<string, string>> {
  if (keys.length === 0) return {};
  const rows = await getDb().photoModeration.findMany({
    where: { key: { in: keys } },
    select: { key: true, sensitivity: true, reason: true, classifiedBy: true },
  });
  return Object.fromEntries(rows.map((r) => [r.key, r.sensitivity]));
}
