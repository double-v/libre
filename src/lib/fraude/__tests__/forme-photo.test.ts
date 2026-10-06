// @vitest-environment node
import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { formeRecuperee, lireFormeRecuperee } from '../forme-photo';

describe('formeRecuperee (spec 006, R4, #446)', () => {
  it.each([
    [1080, 1350, false, true],
    [1350, 1080, false, true],
    [1080, 1080, false, true],
    [1080, 1920, false, true],
    [640, 640, false, true],
    [750, 1334, false, false],
    [1080, 1350, true, false],
    [3024, 4032, false, false],
    [1200, 1600, false, false],
  ])('%i × %i, EXIF %s → %s', (width, height, exif, attendu) => {
    expect(formeRecuperee({ width, height, exif })).toBe(attendu);
  });

  it('sans dimensions lisibles, rien', () => {
    expect(formeRecuperee({ width: undefined, height: undefined, exif: false })).toBe(false);
  });
});

describe('lireFormeRecuperee', () => {
  it('lit les dimensions et l’absence d’EXIF sur le tampon reçu', async () => {
    const png = await sharp({ create: { width: 1080, height: 1350, channels: 3, background: '#c96' } }).jpeg().toBuffer();
    expect(await lireFormeRecuperee(png)).toBe(true);
  });

  it('une photo d’appareil (EXIF présent) n’est pas « récupérée »', async () => {
    const avecExif = await sharp({ create: { width: 1080, height: 1350, channels: 3, background: '#c96' } })
      .jpeg()
      .withExif({ IFD0: { Make: 'Telephone' } })
      .toBuffer();
    expect(await lireFormeRecuperee(avecExif)).toBe(false);
  });

  it('un tampon illisible ne jette pas', async () => {
    expect(await lireFormeRecuperee(Buffer.from('pas une image'))).toBe(false);
  });
});
