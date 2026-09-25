// @vitest-environment node
/**
 * Empreinte de ressemblance (spec 006, research R2) : une photo volée revient
 * recompressée, réduite ou recadrée — elle doit rester « la même » (≤ SEUIL),
 * et une autre photo de composition voisine ne doit pas l'être.
 */
import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { empreinte, distance, SEUIL, memePhoto } from '../empreinte';

function portrait(decalage = 0): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
    <defs><linearGradient id="f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d8b29a"/><stop offset="1" stop-color="#4a3a44"/></linearGradient></defs>
    <rect width="1080" height="1350" fill="url(#f)"/>
    <circle cx="${540 + decalage}" cy="520" r="220" fill="#f1d1bc"/>
    <rect x="${300 + decalage}" y="760" width="480" height="590" rx="120" fill="#2f5d7c"/>
    <circle cx="${200 - decalage}" cy="200" r="90" fill="#fff6e8"/>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toBuffer();
}

async function recadrer(buf: Buffer, part: number): Promise<Buffer> {
  const dx = Math.round(1080 * part / 2), dy = Math.round(1350 * part / 2);
  return sharp(buf).extract({ left: dx, top: dy, width: 1080 - 2 * dx, height: 1350 - 2 * dy }).jpeg({ quality: 80 }).toBuffer();
}

describe('empreinte (#445)', () => {
  it('rend un entier 64 bits signé, stable', async () => {
    const a = await empreinte(await portrait());
    expect(typeof a).toBe('bigint');
    expect(a).toBe(BigInt.asIntN(64, a));
    expect(await empreinte(await portrait())).toBe(a);
  });

  it('recompression et réduction à 640 px : même photo', async () => {
    const orig = await portrait();
    const petite = await sharp(orig).resize({ width: 640 }).jpeg({ quality: 60 }).toBuffer();
    expect(distance(await empreinte(orig), await empreinte(petite))).toBeLessThanOrEqual(SEUIL);
  });

  it.each([0.05, 0.1])('recadrage de %s : même photo', async (part) => {
    const orig = await portrait();
    expect(distance(await empreinte(orig), await empreinte(await recadrer(orig, part)))).toBeLessThanOrEqual(SEUIL);
  });

  it('une autre photo de composition voisine n’est pas la même', async () => {
    const d = distance(await empreinte(await portrait()), await empreinte(await portrait(260)));
    expect(d).toBeGreaterThan(SEUIL);
  });

  it('distance et memePhoto', () => {
    expect(distance(BigInt(0), BigInt(0))).toBe(0);
    expect(distance(BigInt(0), BigInt(-1))).toBe(64);
    expect(memePhoto(BigInt(0), BigInt(0b1111))).toBe(true);
    expect(memePhoto(BigInt(0), (BigInt(1) << BigInt(9)) - BigInt(1))).toBe(false);
  });
});
