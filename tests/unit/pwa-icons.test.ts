import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import sharp from 'sharp';

// Garde de non-régression — icônes PWA (#295, épic #273).
//
// Bug corrigé : les icônes maskable avaient un fond noir (#0a0a0a) → contour noir
// sur l'écran d'accueil Android (l'OS masque l'icône full-bleed). Le fix impose un
// fond **coral opaque** (#E8634A, marque) + le cœur de référence (#294). On lit le
// pixel de coin de chaque icône maskable (full-bleed → doit être coral opaque).
const publicDir = path.resolve(process.cwd(), 'public');
const CORAL = { r: 232, g: 99, b: 74 }; // #E8634A
const SIZES = [48, 72, 96, 144, 192, 512];

async function cornerPixel(file: string) {
  const buf = await sharp(path.join(publicDir, file))
    .extract({ left: 0, top: 0, width: 1, height: 1 })
    .raw()
    .toBuffer();
  return { r: buf[0], g: buf[1], b: buf[2], a: buf[3] };
}

describe('Icônes PWA — fix Android maskable (#295)', () => {
  it.each(SIZES)(
    'icon-maskable-%i.png : fond coral opaque (pas le noir #0a0a0a de l’ancien bug)',
    async (size) => {
      const px = await cornerPixel(`icon-maskable-${size}.png`);
      // maskable = full-bleed → coin opaque (sinon l'OS ajoute un fond noir).
      expect(px.a).toBe(255);
      expect(Math.abs(px.r - CORAL.r)).toBeLessThanOrEqual(4);
      expect(Math.abs(px.g - CORAL.g)).toBeLessThanOrEqual(4);
      expect(Math.abs(px.b - CORAL.b)).toBeLessThanOrEqual(4);
    },
  );

  it('favicon.svg utilise le cœur de référence (plus le cœur-soleil à rayons)', () => {
    const svg = readFileSync(path.join(publicDir, 'favicon.svg'), 'utf-8');
    expect(svg).toMatch(/M12 21s-7\.5-4\.6-10-9\.3/); // path du cœur de référence
    expect(svg).not.toMatch(/<rect x="236"/); // les 5 rayons du cœur-soleil ont disparu
  });
});
