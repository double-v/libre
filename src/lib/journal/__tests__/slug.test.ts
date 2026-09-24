/**
 * Adresse d'une publication (spec 007, R6) : lisible, stable, sans collision.
 */
import { describe, it, expect } from 'vitest';
import { slugDepuisTitre, slugLibre } from '../slug';

describe('slugDepuisTitre', () => {
  it('minuscules, sans accents, tirets', () => {
    expect(slugDepuisTitre('Plus de 100 inscrit·es : merci !')).toBe('plus-de-100-inscrit-es-merci');
    expect(slugDepuisTitre('Où en est Libre — l’été')).toBe('ou-en-est-libre-l-ete');
  });

  it('borné à 80 caractères, sans tiret final', () => {
    const s = slugDepuisTitre('mot '.repeat(40));
    expect(s.length).toBeLessThanOrEqual(80);
    expect(s.endsWith('-')).toBe(false);
  });

  it('titre sans lettre ni chiffre → « publication »', () => {
    expect(slugDepuisTitre('!!! ???')).toBe('publication');
  });
});

describe('slugLibre', () => {
  it('garde la base si libre, sinon suffixe -2, -3…', async () => {
    const pris = new Set(['merci', 'merci-2']);
    expect(await slugLibre('merci', async (s) => pris.has(s))).toBe('merci-3');
    expect(await slugLibre('bonjour', async (s) => pris.has(s))).toBe('bonjour');
  });
});
