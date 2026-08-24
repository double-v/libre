/**
 * Tests — fabrication du dérivé flouté (#330, panne du 2026-08-24).
 *
 * Classer un avatar en prod répondait « Impossible de générer la version
 * floutée. La photo n'a pas été classée. » Les logs Vercel donnaient la cause :
 * `VipsJpeg: Invalid SOS parameters for sequential JPEG` — libvips traite ses
 * avertissements de décodage comme des erreurs, et refusait un fichier que tous
 * les navigateurs affichent. Conséquence : la photo restait **visible de tous**,
 * précisément ce que le classement devait empêcher.
 *
 * Deux garanties à tenir, et elles tirent en sens inverse :
 * 1. le classement ne doit jamais être bloqué par un fichier abîmé ;
 * 2. le dérivé ne doit jamais laisser deviner l'original.
 */
import { describe, it, expect, vi } from 'vitest';
import sharp from 'sharp';
import { blurredDerivativeBuffer } from '../photo-blur';

/** Photo de test : deux moitiés franches, faciles à reconnaître après flou. */
async function photoValide(): Promise<Buffer> {
  return sharp({
    create: { width: 800, height: 1000, channels: 3, background: { r: 240, g: 60, b: 40 } },
  })
    .composite([{
      input: await sharp({
        create: { width: 800, height: 500, channels: 3, background: { r: 20, g: 30, b: 200 } },
      }).png().toBuffer(),
      top: 0, left: 0,
    }])
    .jpeg()
    .toBuffer();
}

describe('blurredDerivativeBuffer — fichiers sains', () => {
  it('rend un JPEG de 512px sur son grand côté, format d’origine conservé', async () => {
    const meta = await sharp(await blurredDerivativeBuffer(await photoValide())).metadata();
    expect(meta.format).toBe('jpeg');
    // Source 800×1000 (portrait) : `fit: inside` garde le rapport, donc c'est
    // la hauteur qui touche 512.
    expect(Math.max(meta.width!, meta.height!)).toBe(512);
    expect(meta.height).toBeGreaterThan(meta.width!);
  });

  it('détruit le détail : le dérivé pèse une fraction de l’original', async () => {
    const source = await photoValide();
    const flou = await blurredDerivativeBuffer(source);
    // Le passage par 16×16 supprime l'information — ce n'est pas une
    // compression, c'est une perte volontaire et irréversible.
    expect(flou.length).toBeLessThan(source.length / 2);
  });
});

describe('blurredDerivativeBuffer — le fichier qui bloquait la modération', () => {
  it('accepte un JPEG que sharp refuse par défaut', async () => {
    const complet = await photoValide();
    // Tronqué en plein flux de balayage : exactement la famille d'erreurs de
    // décodage que libvips remontait en prod.
    const tronque = complet.subarray(0, Math.floor(complet.length * 0.6));

    await expect(
      sharp(tronque).resize(16, 16, { fit: 'inside' }).toBuffer(),
    ).rejects.toThrow();

    const flou = await blurredDerivativeBuffer(tronque, 'tronque.jpg');
    expect((await sharp(flou).metadata()).format).toBe('jpeg');
  });

  it('retombe sur un aplat opaque plutôt que de bloquer le classement', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const flou = await blurredDerivativeBuffer(Buffer.from('ceci n’est pas une image'), 'x.bin');

    const { data, info } = await sharp(flou).raw().toBuffer({ resolveWithObject: true });
    expect(info.width).toBe(512);
    // Uniforme : un aplat ne laisse rien deviner. On échantillonne plusieurs
    // points, pas seulement le centre.
    const pixel = (x: number, y: number) => {
      const i = (y * info.width + x) * info.channels;
      return [data[i], data[i + 1], data[i + 2]];
    };
    const coins = [pixel(2, 2), pixel(info.width - 3, 2), pixel(2, info.height - 3), pixel(255, 255)];
    for (const [r, g, b] of coins) {
      expect(Math.abs(r - coins[0][0])).toBeLessThan(6);
      expect(Math.abs(g - coins[0][1])).toBeLessThan(6);
      expect(Math.abs(b - coins[0][2])).toBeLessThan(6);
    }
  });
});
