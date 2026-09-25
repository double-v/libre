import sharp from 'sharp';

/**
 * Empreinte de ressemblance d'une photo (spec 006, research R2) : dHash
 * 64 bits. L'image est réduite à 9×8 en niveaux de gris, puis chaque pixel
 * est comparé à son voisin de droite. Recompression, réduction et recadrage
 * léger changent à peine l'empreinte ; une autre photo la change beaucoup.
 *
 * Pas de modèle, pas de biométrie : on compare des images, pas des visages.
 */
export const SEUIL = 8;

// `BigInt(…)` plutôt que les littéraux `1n` : la cible du projet est ES2017.
const ZERO = BigInt(0);
const UN = BigInt(1);

/** Entier signé : c'est ce que stocke un `BIGINT` PostgreSQL. */
export async function empreinte(image: Buffer): Promise<bigint> {
  const px = await sharp(image).greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer();
  let h = ZERO;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      h = (h << UN) | (px[y * 9 + x] > px[y * 9 + x + 1] ? UN : ZERO);
    }
  }
  return BigInt.asIntN(64, h);
}

/** Distance de Hamming entre deux empreintes. */
export function distance(a: bigint, b: bigint): number {
  let x = BigInt.asUintN(64, a ^ b);
  let n = 0;
  while (x) {
    n += Number(x & UN);
    x >>= UN;
  }
  return n;
}

export function memePhoto(a: bigint, b: bigint): boolean {
  return distance(a, b) <= SEUIL;
}
