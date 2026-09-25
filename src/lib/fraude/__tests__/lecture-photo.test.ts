// @vitest-environment node
/**
 * Lecture du texte incrusté sur une photo (spec 006, research R1). Vrai
 * moteur, vrai modèle embarqué : c'est le seul moyen de savoir que le cas du
 * 2026-09-24 (identifiant Telegram écrit sur la photo) est lu sans réseau.
 */
import { describe, it, expect, afterAll } from 'vitest';
import sharp from 'sharp';
import { lireTexte, arreterLecture } from '../lecture-photo';

async function photoAvecTexte(texte: string): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
    <rect width="1080" height="1350" fill="#c9a48a"/>
    <text x="80" y="1200" font-family="DejaVu Sans, sans-serif" font-size="64" font-weight="bold" fill="#ffffff">${texte}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg().toBuffer();
}

afterAll(async () => {
  await arreterLecture();
});

describe('lireTexte (#443)', () => {
  it('lit l’identifiant écrit sur la photo', async () => {
    const texte = await lireTexte(await photoAvecTexte('Telegram : @lola_privee75'));
    expect(texte.toLowerCase()).toContain('@lola_privee75');
  }, 60_000);

  it('lit une photo de téléphone pleine taille, texturée, en quelques secondes au plus (free tier)', async () => {
    const W = 3024, H = 4032;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <filter id="n"><feTurbulence baseFrequency="0.8" numOctaves="2"/></filter>
      <rect width="${W}" height="${H}" fill="#9a7a6a"/>
      <rect width="${W}" height="${H}" filter="url(#n)" opacity="0.25"/>
      <text x="200" y="3550" font-family="DejaVu Sans, sans-serif" font-size="178" font-weight="bold" fill="#ffffff">Telegram : @lola_privee75</text>
    </svg>`;
    const grande = await sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
    await lireTexte(await photoAvecTexte('x')); // worker chaud : on mesure la lecture, pas l'init
    const debut = Date.now();
    const texte = await lireTexte(grande);
    expect(texte.toLowerCase()).toContain('@lola_privee75');
    // Lue telle quelle, cette photo dépassait 15 s sans rien lire.
    expect(Date.now() - debut).toBeLessThan(5_000);
  }, 60_000);

  it('rend une chaîne vide sur une photo sans texte, sans jeter', async () => {
    const vide = await sharp({ create: { width: 400, height: 500, channels: 3, background: '#88aacc' } }).jpeg().toBuffer();
    expect((await lireTexte(vide)).trim()).toBe('');
  }, 60_000);

  it('rend une chaîne vide sur des octets qui ne sont pas une image, sans jeter', async () => {
    expect(await lireTexte(Buffer.from('pas une image'))).toBe('');
  }, 60_000);
});
