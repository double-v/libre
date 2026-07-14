/**
 * Garde de non-régression — confinement de l'ambiance « lobby » (#282, épic #273).
 *
 * L'ambiance sombre-chaude de la landing (le marqueur `data-lobby` + les classes
 * `.lobby-*`, tous adossés aux tokens `--lobby-*`) est une **signature home-only**.
 * Partout ailleurs, le shell est theme-aware (tokens sémantiques). Ce test échoue
 * si un composant hors de `src/components/home-lobby/` **utilise** une classe
 * `lobby-*` ou l'attribut `data-lobby` — c'est-à-dire si l'ambiance fuit hors de
 * la home. Les mentions en commentaire (JSDoc) sont ignorées : on ne scanne que
 * le code réel. Cf. DESIGN.md § La landing « lobby ».
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '..');
const HOME_LOBBY = path.join(SRC, 'components', 'home-lobby');

/** Liste récursive des fichiers .ts/.tsx sous `dir`, hors `home-lobby/` et tests. */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (full === HOME_LOBBY) continue; // la home a le droit — c'est sa signature
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** Retire les commentaires (blocs /* *\/ + lignes //) pour ne scanner que le code. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

describe('confinement ambiance lobby (#282)', () => {
  const files = sourceFiles(SRC);

  it('ne scanne pas un arbre vide (sanity)', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it("aucun code hors home-lobby/ n'utilise une classe .lobby-* ni l'attribut data-lobby", () => {
    const leaks: string[] = [];
    for (const file of files) {
      const code = stripComments(readFileSync(file, 'utf8'));
      // Classe lobby-* dans un attribut className (string ou template).
      if (/className=(["'`])[^"'`]*\blobby-/.test(code)) {
        leaks.push(`${path.relative(SRC, file)} — className lobby-*`);
      }
      // Attribut JSX data-lobby (pas une mention en backticks, déjà retirée si en commentaire).
      if (/(?<![\w-])data-lobby(?=[\s=/>])/.test(code)) {
        leaks.push(`${path.relative(SRC, file)} — data-lobby`);
      }
    }
    expect(leaks, `fuite d'ambiance lobby hors de la home :\n${leaks.join('\n')}`).toEqual([]);
  });
});
