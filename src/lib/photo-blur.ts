/**
 * Fabrication du dérivé flouté (#330), isolée du stockage.
 *
 * Séparée de `r2.ts` pour être testable sans R2 : c'est ici que se joue la
 * garantie — ce buffer est ce que verra quiconque n'a pas demandé à voir
 * l'original.
 */

/** Aplat servi quand l'image est indécodable : gris chaud, neutre. */
const APLAT = { r: 82, g: 74, b: 78 };

/**
 * Version floutée d'une photo, en JPEG.
 *
 * **Deux passes, et c'est indispensable** : sharp ne chaîne pas deux `resize`
 * dans un même pipeline — le second écrase le premier. Enchaînés, le
 * sous-échantillonnage n'aurait jamais lieu et il ne resterait qu'un flou léger
 * sur l'image pleine taille : un texte y reste parfaitement lisible (vérifié
 * sur pixels, un numéro de téléphone se lisait encore).
 *
 * **`failOn: 'none'`** : par défaut libvips traite ses avertissements comme des
 * erreurs et refuse un JPEG un peu hors norme. Un vrai avatar de la base a fait
 * échouer le classement en prod avec « VipsJpeg: Invalid SOS parameters for
 * sequential JPEG » — un fichier que tous les navigateurs affichent sans
 * broncher. Refuser de le flouter le laissait visible de tous : exactement
 * l'inverse du but.
 */
export async function blurredDerivativeBuffer(buffer: Buffer, key = '?'): Promise<Buffer> {
  // Import dynamique : `sharp` est un binaire natif lourd, inutile de le
  // charger dans les routes qui ne floutent rien.
  const sharp = (await import('sharp')).default;

  let minuscule: Buffer;
  try {
    minuscule = await sharp(buffer, { failOn: 'none' })
      .resize(16, 16, { fit: 'inside' })  // l'information disparaît ici
      .toBuffer();
  } catch (err) {
    // Illisible même en tolérant tout. Plutôt que de bloquer la modération sur
    // un fichier abîmé, on sert un aplat : il ne montre rien de l'original,
    // donc la garantie tient, et la photo peut enfin être classée.
    console.error('[photo-blur] image indécodable, aplat opaque:', key, err);
    minuscule = await sharp({
      create: { width: 16, height: 16, channels: 3, background: APLAT },
    }).jpeg().toBuffer();
  }

  return sharp(minuscule)
    .blur(4)                              // adoucit les marches d'escalier
    .resize(512, 512, { fit: 'inside', kernel: 'cubic' })
    .jpeg({ quality: 70 })
    .toBuffer();
}
