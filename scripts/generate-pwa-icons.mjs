// Génère les icônes PWA de Libre à partir du glyphe cœur de référence (#294).
//
// Corrige le bug Android (#295) : les anciennes icônes maskable avaient un fond
// noir (#0a0a0a) → contour noir sur l'écran d'accueil. Ici, fond **coral** de la
// marque (#E8634A) + cœur blanc, cohérent avec la pastille de la lobby-nav et
// `favicon.svg`.
//
// - « any »      : carré arrondi coral + cœur (icône d'app visible sur tout fond,
//                  sert aussi d'apple-touch-icon).
// - « maskable » : full-bleed coral + cœur dans la safe zone (l'OS masque en
//                  cercle/squircle — aucun fond noir).
//
// Usage : node scripts/generate-pwa-icons.mjs
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const CORAL = '#E8634A';
const HEART =
  'M12 21s-7.5-4.6-10-9.3C.4 8.1 2 4 6 4c2.2 0 3.8 1.3 6 3.7C14.2 5.3 15.8 4 18 4c4 0 5.6 4.1 4 7.7C19.5 16.4 12 21 12 21z';

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const SIZES = [48, 72, 96, 144, 192, 512];

// Cœur blanc centré dans un canevas 512, à la taille `glyph` (px).
function heartGroup(glyph) {
  const scale = glyph / 24;
  const offset = (512 - glyph) / 2;
  return `<g fill="#fff" transform="translate(${offset},${offset}) scale(${scale})"><path d="${HEART}"/></g>`;
}

// « any » : carré arrondi coral + cœur généreux (62%).
const standardSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="${CORAL}"/>${heartGroup(320)}</svg>`;
// « maskable » : full-bleed coral + cœur dans la safe zone (47%).
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="${CORAL}"/>${heartGroup(240)}</svg>`;

async function emit(svg, prefix) {
  const buf = Buffer.from(svg);
  for (const size of SIZES) {
    const out = path.join(publicDir, `${prefix}${size}.png`);
    await sharp(buf).resize(size, size).png().toFile(out);
    console.log('✓', path.relative(publicDir, out));
  }
}

await emit(standardSvg, 'icon-');
await emit(maskableSvg, 'icon-maskable-');
console.log('Icônes PWA régénérées (fond coral, cœur de référence).');
