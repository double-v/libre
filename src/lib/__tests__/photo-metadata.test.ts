/**
 * Retrait des métadonnées des photos (#441).
 *
 * Une photo prise au téléphone peut porter la position GPS de sa prise de vue
 * — souvent le domicile. Servie telle quelle aux autres membres, elle rendrait
 * inutiles le flou GPS et les distances en tranches. Ces tests fabriquent de
 * vraies images porteuses d'EXIF avec sharp : pas de mock, c'est le binaire
 * qui doit ressortir propre.
 */
import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { aDesMetadonnees, retirerMetadonnees } from '../photo-metadata';

const GPS = {
  IFD0: { Make: 'Téléphone', Model: 'Modèle 12', Software: 'appareil' },
  IFD3: {
    GPSLatitudeRef: 'N',
    GPSLatitude: '48/1 51/1 2410/100',
    GPSLongitudeRef: 'E',
    GPSLongitude: '2/1 21/1 780/100',
  },
};

/** Image 40×20 (paysage), rouge à gauche, bleue à droite. */
async function base(): Promise<sharp.Sharp> {
  const gauche = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#ff0000' } }).png().toBuffer();
  return sharp({ create: { width: 40, height: 20, channels: 3, background: '#0000ff' } })
    .composite([{ input: gauche, left: 0, top: 0 }]);
}

async function jpegAvecGps(orientation?: number): Promise<Buffer> {
  const img = (await base()).jpeg().withExif(GPS);
  return (orientation ? img.withMetadata({ orientation }) : img).toBuffer();
}

describe('retirerMetadonnees', () => {
  it('une image portant une position GPS en EXIF ressort sans aucune métadonnée', async () => {
    const entree = await jpegAvecGps();
    const avant = await sharp(entree).metadata();
    expect(avant.exif).toBeDefined(); // garde : le test porte bien une position

    const { buffer, avaitMetadonnees } = await retirerMetadonnees(entree, 'image/jpeg');
    const apres = await sharp(buffer).metadata();

    expect(avaitMetadonnees).toBe(true);
    expect(apres.format).toBe('jpeg');
    expect(apres.exif).toBeUndefined();
    expect(apres.xmp).toBeUndefined();
    expect(apres.iptc).toBeUndefined();
    expect(apres.orientation).toBeUndefined();
    // Ceinture : aucune trace textuelle de l'appareil dans les octets servis.
    expect(buffer.includes(Buffer.from('Modèle 12'))).toBe(false);
    expect(await aDesMetadonnees(buffer)).toBe(false);
  });

  it('applique l’orientation EXIF avant de la retirer : un portrait reste un portrait', async () => {
    // Orientation 6 = « tourner de 90° dans le sens horaire pour afficher ».
    const entree = await jpegAvecGps(6);
    const { buffer } = await retirerMetadonnees(entree, 'image/jpeg');
    const apres = await sharp(buffer).metadata();

    expect(apres.orientation).toBeUndefined();
    expect([apres.width, apres.height]).toEqual([20, 40]);
    // Rouge en haut une fois tourné : le coin haut-gauche est rouge, le bas bleu.
    const { data, info } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true });
    const px = (x: number, y: number) => {
      const i = (y * info.width + x) * info.channels;
      return [data[i], data[i + 1], data[i + 2]];
    };
    for (const [x, y] of [[2, 2], [17, 5], [10, 15]]) expect(px(x, y)[0]).toBeGreaterThan(200);
    for (const [x, y] of [[2, 37], [17, 25], [10, 34]]) expect(px(x, y)[2]).toBeGreaterThan(200);
  });

  it('garde le format déclaré (PNG et WebP), sans métadonnée', async () => {
    for (const [mime, format] of [['image/png', 'png'], ['image/webp', 'webp']] as const) {
      const entree = await (await base())[format]().withExif(GPS).toBuffer();
      const { buffer, avaitMetadonnees } = await retirerMetadonnees(entree, mime);
      const apres = await sharp(buffer).metadata();
      expect(apres.format).toBe(format);
      expect(apres.exif).toBeUndefined();
      expect(avaitMetadonnees).toBe(true);
    }
  });

  it('une image sans métadonnée le dit (indice spec 006, en booléen seulement)', async () => {
    const entree = await (await base()).jpeg().toBuffer();
    const { avaitMetadonnees } = await retirerMetadonnees(entree, 'image/jpeg');
    expect(avaitMetadonnees).toBe(false);
    expect(await aDesMetadonnees(entree)).toBe(false);
  });

  it('lève sur un contenu indécodable : mieux vaut refuser que stocker l’original', async () => {
    await expect(retirerMetadonnees(Buffer.from('pas une image'), 'image/jpeg')).rejects.toThrow();
  });
});
