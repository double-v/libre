import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public');

mkdirSync(outDir, { recursive: true });

/**
 * Draw a rounded rectangle path on the canvas context.
 */
function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * Generate a PWA icon PNG at the given size.
 */
function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Black background with rounded corners
  const radius = size * 0.18; // ~18% corner radius
  roundedRect(ctx, 0, 0, size, size, radius);
  ctx.fillStyle = '#000000';
  ctx.fill();

  // White "PG" text, bold, centered
  const fontSize = Math.round(size * 0.45);
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PG', size / 2, size / 2);

  const buf = canvas.toBuffer('image/png');
  const filePath = join(outDir, `icon-${size}.png`);
  writeFileSync(filePath, buf);
  console.log(`Generated ${filePath}`);
}

generateIcon(192);
generateIcon(512);

/**
 * Generate a 1200x630 OG image for social sharing.
 */
function generateOgImage() {
  const width = 1200;
  const height = 630;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Black background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // "Libre" in large white text
  const titleFontSize = 120;
  ctx.font = `bold ${titleFontSize}px sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Libre', width / 2, height / 2 - 60);

  // Tagline underneath
  const taglineFontSize = 36;
  ctx.font = `${taglineFontSize}px sans-serif`;
  ctx.fillStyle = '#9ca3af'; // gray-400
  ctx.fillText('Rencontre libre et gratuite. Sans abonnement, sans revente de données.', width / 2, height / 2 + 40);

  const buf = canvas.toBuffer('image/png');
  const filePath = join(outDir, 'og-image.png');
  writeFileSync(filePath, buf);
  console.log(`Generated ${filePath}`);
}

generateOgImage();