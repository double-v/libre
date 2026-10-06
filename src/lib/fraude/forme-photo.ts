/**
 * Forme d'une photo « récupérée » (spec 006, research R4, #446) : les réseaux
 * sociaux ré-encodent les images à quelques tailles fixes et retirent les
 * métadonnées. Une photo à ces dimensions, sans aucun EXIF, a probablement
 * été enregistrée depuis un réseau plutôt que prise par la personne.
 *
 * Indice **faible** : beaucoup de vrais membres publient une photo déjà en
 * ligne ailleurs. Il ne fait jamais entrer un profil seul dans la file
 * (`dansLaFile`) ; il ne sert qu'à départager.
 *
 * Doit être lu sur le tampon **reçu**, avant le nettoyage des métadonnées
 * (#441) : après, toutes les photos seraient sans EXIF.
 */
const COTES_LONGS = new Set([640, 750, 1080, 1350, 1920]);
const COTES_COURTS = new Set([640, 750, 1080]);

export function formeRecuperee(m: { width?: number; height?: number; exif: boolean }): boolean {
  if (!m.width || !m.height || m.exif) return false;
  const long = Math.max(m.width, m.height);
  const court = Math.min(m.width, m.height);
  return COTES_LONGS.has(long) && COTES_COURTS.has(court);
}

/** Best-effort : une image illisible n'est pas un indice. */
export async function lireFormeRecuperee(buffer: Buffer): Promise<boolean> {
  try {
    const sharp = (await import('sharp')).default;
    const m = await sharp(buffer, { failOn: 'none' }).metadata();
    return formeRecuperee({ width: m.width, height: m.height, exif: Boolean(m.exif) });
  } catch {
    return false;
  }
}
