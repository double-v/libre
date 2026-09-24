/**
 * Garde de source (spec 007, FR-004 ; research R1) : les pages publiques du
 * journal ne lisent jamais la session ni rien qui varie selon le visiteur.
 *
 * C'est ce qui garantit que la couche connectée de #352 (commentaires) ne
 * pourra pas fuiter dans le HTML servi à Googlebot ni dans une entrée de cache
 * CDN : la page est la même pour tous, par construction. `force-static`
 * ferme la porte à l'exécution ; ce test la ferme à la relecture.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const RACINE = join(process.cwd(), 'src/app/journal');

function fichiers(dir: string): string[] {
  return readdirSync(dir).flatMap((nom) => {
    const chemin = join(dir, nom);
    if (statSync(chemin).isDirectory()) return nom === '__tests__' ? [] : fichiers(chemin);
    return /\.(tsx?|jsx?)$/.test(nom) ? [chemin] : [];
  });
}

const INTERDITS = [/getServerSession/, /\bcookies\s*\(/, /\bheaders\s*\(/, /useSession/, /next-auth/, /draftMode/];

describe('journal public sans session (FR-004)', () => {
  const sources = fichiers(RACINE);

  it('les deux pages existent', () => {
    const rel = sources.map((f) => f.slice(RACINE.length + 1)).sort();
    expect(rel).toEqual(expect.arrayContaining(['page.tsx', '[slug]/page.tsx']));
  });

  it.each(INTERDITS.map((re) => [re.source, re] as const))('aucun fichier n’utilise %s', (_nom, re) => {
    for (const f of sources) expect(readFileSync(f, 'utf8'), f).not.toMatch(re);
  });

  it('chaque page est statique : force-static déclaré, jamais « use client »', () => {
    for (const f of sources.filter((s) => s.endsWith('page.tsx'))) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).toMatch(/export const dynamic = 'force-static'/);
      expect(src, f).not.toMatch(/^['"]use client['"]/m);
    }
  });
});
