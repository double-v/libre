// @vitest-environment node
/**
 * Téléversement du selfie (spec 012, FR-S03, FR-S04) sur de vraies images.
 *
 * Seul le client R2 est simulé : il garde l'objet qu'on lui envoie, et c'est
 * cet objet qu'on relit avec sharp. Le plafond de pixels doit tomber avant le
 * décodage : une image de quelques Ko peut annoncer des centaines de
 * millions de pixels.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import sharp from 'sharp';

const stockes: Array<{ Key: string; Body: Buffer }> = [];
vi.mock('@aws-sdk/client-s3', () => {
  class S3Client { send = async (c: { input: { Key: string; Body: Buffer } }) => { stockes.push(c.input); }; }
  class PutObjectCommand { constructor(public input: unknown) {} }
  class GetObjectCommand { constructor(public input: unknown) {} }
  class DeleteObjectCommand { constructor(public input: unknown) {} }
  return { __esModule: true, S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand };
});
vi.mock('@aws-sdk/s3-request-presigner', () => ({ __esModule: true, getSignedUrl: vi.fn() }));

Object.assign(process.env, {
  R2_ACCOUNT_ID: 'a', R2_ACCESS_KEY_ID: 'k', R2_SECRET_ACCESS_KEY: 's', R2_BUCKET_NAME: 'b',
});
const { televerserPhoto } = await import('../r2');

const ME = '11111111-1111-4111-8111-111111111111';
const MAX = 50_000_000;

function fichier(buf: Buffer, type = 'image/jpeg', nom = 'selfie.jpg') {
  return new File([new Uint8Array(buf)], nom, { type });
}
async function jpeg({ largeur = 400, hauteur = 500, exif }: { largeur?: number; hauteur?: number; exif?: Record<string, Record<string, string>> } = {}) {
  let p = sharp({ create: { width: largeur, height: hauteur, channels: 3, background: '#c98d6b' } });
  if (exif) p = p.withExif(exif);
  return p.jpeg().toBuffer();
}

beforeEach(() => { stockes.length = 0; });

describe('FR-S03 — taille et pixels', () => {
  it('image annonçant plus de 50 Mpx : refusée sur l’en-tête, rien de stocké', async () => {
    // PNG 8000×8000 d'une seule couleur : 64 Mpx pour quelques Ko.
    const geante = await sharp({ create: { width: 8000, height: 8000, channels: 3, background: '#fff' } }).png({ compressionLevel: 9 }).toBuffer();
    expect(geante.byteLength).toBeLessThan(5 * 1024 * 1024);
    await expect(televerserPhoto(fichier(geante, 'image/png', 's.png'), ME, { dossier: 'verif', pixelsMax: MAX }))
      .rejects.toThrow(/trop grande/);
    expect(stockes).toHaveLength(0);
  });

  it('juste sous le plafond : acceptée', async () => {
    const ok = await jpeg({ largeur: 1000, hauteur: 1200 });
    await televerserPhoto(fichier(ok), ME, { dossier: 'verif', pixelsMax: 1000 * 1200 });
    expect(stockes).toHaveLength(1);
  });

  it('plus de 5 Mo : refusée avant toute lecture', async () => {
    const lourd = Buffer.concat([await jpeg(), Buffer.alloc(5 * 1024 * 1024)]);
    await expect(televerserPhoto(fichier(lourd), ME, { dossier: 'verif', pixelsMax: MAX })).rejects.toThrow(/5 Mo/);
    expect(stockes).toHaveLength(0);
  });

  it('faux JPEG (HTML déclaré image/jpeg) : refusé', async () => {
    const html = Buffer.from('<html><script>alert(1)</script></html>');
    await expect(televerserPhoto(fichier(html), ME, { dossier: 'verif', pixelsMax: MAX })).rejects.toThrow();
    expect(stockes).toHaveLength(0);
  });

  it('polyglotte : en-tête JPEG suivi de déchets, indécodable → refusé, rien de stocké', async () => {
    const poly = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]), Buffer.from('<?php system($_GET[0]); ?>')]);
    await expect(televerserPhoto(fichier(poly), ME, { dossier: 'verif', pixelsMax: MAX })).rejects.toThrow();
    expect(stockes).toHaveLength(0);
  });

  it('PNG déclaré JPEG : refusé', async () => {
    const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#000' } }).png().toBuffer();
    await expect(televerserPhoto(fichier(png, 'image/jpeg'), ME, { dossier: 'verif', pixelsMax: MAX })).rejects.toThrow(/ne correspondent pas/);
  });
});

describe('FR-S04 — métadonnées', () => {
  it('GPS dans le fichier envoyé : absent de l’objet stocké, booléen « avait des métadonnées » vrai', async () => {
    const avecGps = await jpeg({ exif: { IFD0: { Make: 'Telephone', Model: 'X' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '48/1 51/1 24/1' } } });
    expect((await sharp(avecGps).metadata()).exif).toBeDefined();
    expect(avecGps.includes(Buffer.from('Telephone'))).toBe(true);
    const r = await televerserPhoto(fichier(avecGps), ME, { dossier: 'verif', pixelsMax: MAX });
    expect(r.avaitMetadonnees).toBe(true);
    const stocke = stockes[0].Body;
    const m = await sharp(stocke).metadata();
    expect(m.exif).toBeUndefined();
    expect(stocke.includes(Buffer.from('GPS'))).toBe(false);
    expect(stocke.includes(Buffer.from('Telephone'))).toBe(false);
    // L'image rendue pour la lecture est celle qui a été stockée.
    expect(r.propre.equals(stocke)).toBe(true);
    expect(stockes[0].Key.startsWith(`${ME}/verif/`)).toBe(true);
  });

  it('fichier sans aucune métadonnée : booléen faux', async () => {
    const r = await televerserPhoto(fichier(await jpeg()), ME, { dossier: 'verif', pixelsMax: MAX });
    expect(r.avaitMetadonnees).toBe(false);
  });
});
