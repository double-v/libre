/**
 * #436 — le geste du selfie de vérification.
 *
 * Tiré par le serveur : un selfie déjà publié ailleurs ne le respecte pas. La
 * moitié se fait sans les mains, pour qui ne peut pas faire un geste de la main.
 */
import { describe, it, expect } from 'vitest';
import { GESTES, geste, tirerGeste } from '../gestes';

describe('gestes', () => {
  it('huit gestes, dont quatre sans les mains, aux codes uniques', () => {
    expect(GESTES).toHaveLength(8);
    expect(GESTES.filter((g) => g.type === 'visage')).toHaveLength(4);
    expect(new Set(GESTES.map((g) => g.code)).size).toBe(8);
  });

  it('retrouve un geste par son code, et rien pour un code inconnu', () => {
    expect(geste('main-ouverte')?.texte).toMatch(/main ouverte/i);
    expect(geste('inconnu')).toBeUndefined();
  });

  it('un nouveau tirage ne rend jamais le geste précédent', () => {
    for (let i = 0; i < 200; i++) {
      expect(tirerGeste('main-ouverte').code).not.toBe('main-ouverte');
    }
  });

  it('le hasard vient de la source fournie', () => {
    expect(tirerGeste(undefined, () => 0).code).toBe(GESTES[0].code);
    expect(tirerGeste(undefined, () => 0.999).code).toBe(GESTES[7].code);
  });
});
