/**
 * Retrait des métadonnées des photos téléversées (#441), isolé du stockage.
 *
 * Une photo prise au téléphone peut porter la position GPS de sa prise de vue
 * — souvent le domicile —, l'heure exacte, le modèle d'appareil. Servie telle
 * quelle, elle rendrait inutiles le flou GPS côté client et les distances en
 * tranches : la trilatération ne sert à rien quand la photo donne la position
 * au mètre. On ré-encode donc **toute** photo avant qu'elle n'atteigne R2.
 */

type Mime = 'image/jpeg' | 'image/png' | 'image/webp';

/**
 * Qualité de ré-encodage. Un peu au-dessus du défaut de sharp (80) : la photo
 * a déjà été compressée une fois par l'appareil, chaque passe en perd.
 */
const QUALITE = 88;

/**
 * Options de lecture partagées.
 *
 * `failOn: 'none'` pour la même raison que le flou (#330) : libvips refuse par
 * défaut des JPEG un peu hors norme que tous les navigateurs affichent.
 * Refuser la photo pour un avertissement du décodeur serait une panne, pas une
 * protection.
 */
const LECTURE = { failOn: 'none' } as const;

/**
 * Vrai si l'image porte des métadonnées qui peuvent identifier ou localiser :
 * EXIF (dont GPS), XMP, IPTC, commentaires PNG.
 *
 * Le profil ICC n'en fait pas partie : il décrit les couleurs, pas la personne,
 * et sharp le convertit en sRGB au ré-encodage.
 */
export async function aDesMetadonnees(buffer: Buffer): Promise<boolean> {
  const sharp = (await import('sharp')).default;
  const m = await sharp(buffer, LECTURE).metadata();
  return Boolean(m.exif || m.xmp || m.iptc || m.comments?.length);
}

/**
 * Ré-encode l'image dans son format d'origine, sans aucune métadonnée.
 *
 * `.rotate()` sans argument applique l'orientation EXIF **puis** la retire :
 * sans lui, un portrait pris au téléphone ressortirait couché, puisque
 * l'information qui le redressait disparaît avec le reste. Et on n'appelle
 * jamais `withMetadata()` / `keepExif()` : c'est leur absence qui garantit
 * une sortie vide.
 *
 * `avaitMetadonnees` est lu **avant** le nettoyage, en booléen seulement :
 * c'est tout ce dont la détection des faux profils a besoin (spec 006, R4) —
 * jamais la position ni l'appareil eux-mêmes.
 *
 * Lève si l'image est indécodable : l'appelant doit refuser le téléversement
 * plutôt que stocker l'original avec ses métadonnées.
 */
export async function retirerMetadonnees(
  buffer: Buffer,
  mime: Mime | string,
): Promise<{ buffer: Buffer; avaitMetadonnees: boolean }> {
  const sharp = (await import('sharp')).default;
  const avaitMetadonnees = await aDesMetadonnees(buffer);

  const pipeline = sharp(buffer, LECTURE).rotate();
  const sortie =
    mime === 'image/png' ? pipeline.png()
    : mime === 'image/webp' ? pipeline.webp({ quality: QUALITE })
    : pipeline.jpeg({ quality: QUALITE, mozjpeg: true });

  return { buffer: await sortie.toBuffer(), avaitMetadonnees };
}
