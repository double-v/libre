/**
 * #479 — les pages légales et la FAQ enveloppent leur texte dans `.prose`,
 * mais le plugin typographie n'est pas installé : sans règles maison, le
 * preflight de Tailwind met tous les titres à la taille du texte, retire les
 * puces et laisse les tableaux nus, en silence (aucun test de classe ne le
 * voit). Cette garde échoue si une page utilise `.prose` alors que les règles
 * ont disparu de `globals.css`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync('src/app/globals.css', 'utf8');

function pages(dir: string): string[] {
  return readdirSync(dir).flatMap((nom) => {
    const chemin = join(dir, nom);
    if (statSync(chemin).isDirectory()) return nom === '__tests__' ? [] : pages(chemin);
    return nom === 'page.tsx' ? [chemin] : [];
  });
}

describe('.prose sans plugin typographie (#479)', () => {
  const utilisatrices = pages('src/app').filter((f) => /className="prose\b/.test(readFileSync(f, 'utf8')));

  it('des pages utilisent bien .prose (sinon cette garde ne garde rien)', () => {
    expect(utilisatrices.length).toBeGreaterThan(0);
  });

  it.each(['h1', 'h2', 'h3', 'ul', 'ol', 'table', 'th, td'])('globals.css style « .prose %s »', (el) => {
    expect(css).toContain(`.prose :where(${el})`);
  });

  it('les règles vivent dans @layer components, pour que les utilitaires gardent le dernier mot', () => {
    const debut = css.indexOf('@layer components {');
    expect(debut).toBeGreaterThan(-1);
    expect(css.indexOf('.prose :where(h1)')).toBeGreaterThan(debut);
  });
});
