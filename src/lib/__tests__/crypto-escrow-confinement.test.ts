/**
 * Garde de non-régression — confinement de la clé maître (#198).
 *
 * `crypto-escrow` ouvre et scelle le coffre avec `CHAT_ESCROW_KEY`. Si un jour
 * un composant client l'importe, cette variable part dans le bundle envoyé au
 * navigateur : toutes les clés privées de tous les comptes deviennent
 * déchiffrables par n'importe qui. La garde runtime du module échoue déjà à
 * l'import, mais elle échoue *à l'exécution* — ce test échoue *à la CI*, avant
 * qu'un être humain ne voie la panne.
 *
 * Même patron que `src/__tests__/lobby-confinement.test.ts` (#282) : on scanne
 * le code réel, pas les commentaires.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '..', '..');

function fichiersSources(dir: string): string[] {
  const out: string[] = [];
  for (const entree of readdirSync(dir, { withFileTypes: true })) {
    const complet = path.join(dir, entree.name);
    if (entree.isDirectory()) {
      if (entree.name === '__tests__' || entree.name === 'generated' || entree.name === 'node_modules') {
        continue;
      }
      out.push(...fichiersSources(complet));
    } else if (/\.tsx?$/.test(entree.name)) {
      out.push(complet);
    }
  }
  return out;
}

/** Retire commentaires de bloc et de ligne : on ne juge que le code. */
function sansCommentaires(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const IMPORTE_ESCROW = /from\s+['"](?:@\/lib\/crypto-escrow|\.{1,2}\/[^'"]*crypto-escrow)['"]/;

describe('confinement de la clé maître (#198)', () => {
  it("aucun module marqué 'use client' n'importe crypto-escrow", () => {
    const coupables = fichiersSources(SRC).filter((fichier) => {
      const code = sansCommentaires(readFileSync(fichier, 'utf8'));
      const estClient = /^\s*['"]use client['"]/m.test(code);
      return estClient && IMPORTE_ESCROW.test(code);
    });

    expect(coupables.map((f) => path.relative(SRC, f))).toEqual([]);
  });

  it('le module refuse lui-même de se charger là où window existe', () => {
    const source = readFileSync(path.join(SRC, 'lib', 'crypto-escrow.ts'), 'utf8');
    expect(sansCommentaires(source)).toMatch(/typeof window !== 'undefined'/);
  });
});
