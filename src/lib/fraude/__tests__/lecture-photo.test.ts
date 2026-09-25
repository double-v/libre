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

  it('rend une chaîne vide sur une photo sans texte, sans jeter', async () => {
    const vide = await sharp({ create: { width: 400, height: 500, channels: 3, background: '#88aacc' } }).jpeg().toBuffer();
    expect((await lireTexte(vide)).trim()).toBe('');
  }, 60_000);

  it('rend une chaîne vide sur des octets qui ne sont pas une image, sans jeter', async () => {
    expect(await lireTexte(Buffer.from('pas une image'))).toBe('');
  }, 60_000);
});
