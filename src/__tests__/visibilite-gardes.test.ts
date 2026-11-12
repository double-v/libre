/**
 * Garde — un compte en retrait (spec 006, #444) disparaît de partout où un
 * membre voit d'autres membres, comme un compte banni. Test statique : chaque
 * route membre qui lit `isBanned` doit passer par `@/lib/fraude/visibilite`,
 * sinon elle cache les bannis mais laisse passer les comptes en retrait.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { estVisible, visiblePourAutrui } from '@/lib/fraude/visibilite';

const API = path.join(process.cwd(), 'src/app/api');

/** Routes qui lisent `isBanned` pour autre chose que montrer des profils. */
const EXEMPTEES: Record<string, string> = {
  'stats/public/route.ts': 'un compte, pas un profil montré',
  'circle/contacts/route.ts': 'ajout à un cercle de confiance, pas une vitrine',
};

function routes(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) return f === '__tests__' || f === 'admin' ? [] : routes(p);
    return f === 'route.ts' ? [p] : [];
  });
}

describe('visibilité pour autrui (#444)', () => {
  it('un compte banni ou en retrait n’est pas visible', () => {
    expect(estVisible({ isBanned: false, retraitAt: null })).toBe(true);
    expect(estVisible({ isBanned: true, retraitAt: null })).toBe(false);
    expect(estVisible({ isBanned: false, retraitAt: new Date() })).toBe(false);
    expect(visiblePourAutrui).toEqual({ isBanned: false, retraitAt: null });
  });

  // Une route qui lit `isBanned` ou la visibilité : celles qui montrent des profils.
  const lisantIsBanned = routes(API).filter((f) => /isBanned|fraude\/visibilite/.test(readFileSync(f, 'utf8')));

  it('trouve bien les routes à contrôler', () => {
    expect(lisantIsBanned.length).toBeGreaterThanOrEqual(5);
  });

  it.each(lisantIsBanned.map((f) => [path.relative(API, f), f]))('%s passe par la visibilité', (rel, f) => {
    if (EXEMPTEES[rel]) return;
    const src = readFileSync(f, 'utf8');
    expect(src, `${rel} lit isBanned sans @/lib/fraude/visibilite`).toContain('@/lib/fraude/visibilite');
    expect(src, `${rel} garde un test isBanned isolé`).not.toMatch(/isBanned:\s*false|\.isBanned\)|user\.isBanned\b(?!:)/);
  });
});
