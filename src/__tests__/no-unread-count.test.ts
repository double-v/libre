/**
 * Garde de charte — aucun nombre de non-lus côté membre (#389, spec 003 FR-006).
 *
 * `PRODUCT.md` bannit « tu as 3 likes non lus » comme appât. La spec en fait un
 * invariant : la pastille dit qu'il y a du nouveau, jamais combien. Ce test
 * échoue si une surface membre se met à rendre `conversationIds.length`, un
 * `.length` de non-lus dans du JSX, ou un libellé « N non lu(s) ».
 * Les surfaces admin (`(admin)`, `components/admin`) sont hors champ : le chiffre
 * y est légitime (`CountChip`), c'est une file de travail.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['src/app/(main)', 'src/components', 'src/hooks'];
const EXCLUDE = [/__tests__/, /src\/components\/admin\//, /\.test\.tsx?$/];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

const FORBIDDEN: Array<{ re: RegExp; why: string }> = [
  { re: /conversationIds\.length\s*[^>=!]/, why: 'rend le nombre de conversations non lues' },
  { re: /\{\s*unread(?:Count|Total|s)?\s*\}/i, why: 'interpole un compteur de non-lus dans du JSX' },
  { re: /\d+\s+non[- ]lus?/i, why: 'libellé « N non lu(s) »' },
  { re: /\{[^}]*\bunread[^}]*\.length\s*\}/i, why: 'interpole une longueur de non-lus dans du JSX' },
];

describe('charte — aucun nombre de non-lus côté membre', () => {
  const files = ROOTS.flatMap((r) => walk(r)).filter((f) => !EXCLUDE.some((re) => re.test(f)));

  it('parcourt bien les surfaces membre', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  for (const file of files) {
    it(`${file} ne rend aucun compteur de non-lus`, () => {
      const src = readFileSync(file, 'utf8');
      for (const { re, why } of FORBIDDEN) {
        expect(src, `${file} : ${why} (${re})`).not.toMatch(re);
      }
    });
  }
});
