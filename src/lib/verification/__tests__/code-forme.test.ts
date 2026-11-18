/**
 * Extraction du code lu et marquage des divergences (spec 012, FR-004, FR-006).
 * La lecture n'est qu'un indice : mieux vaut « impossible » qu'un faux code.
 */
import { describe, it, expect } from 'vitest';
import { comparerCode, normaliserCodeLu } from '../code-forme';

describe('normaliserCodeLu', () => {
  it.each([
    ['7358', '7358'],
    ['LIBRE 7358', '7358'],
    ['  7358\n', '7358'],
    ['8 7358', '7358'],
    ['Libre\n4926\n', '4926'],
  ])('%j → %s', (texte, attendu) => expect(normaliserCodeLu(texte)).toBe(attendu));

  it.each([
    ['', 'rien lu'],
    ['735', 'trois chiffres'],
    ['73589', 'cinq chiffres collés : pas un code'],
    ['7 3 5 8', 'chiffres épars : jamais recollés'],
    ['1234', 'chiffres hors alphabet'],
    ['7038', 'un zéro dans le mot'],
  ])('%j → vide (%s)', (texte) => expect(normaliserCodeLu(texte)).toBe(''));
});

describe('comparerCode', () => {
  it('marque chaque caractère divergent à sa place', () => {
    expect(comparerCode('4926', '4962')).toEqual([
      { c: '4', ok: true }, { c: '9', ok: true }, { c: '6', ok: false }, { c: '2', ok: false },
    ]);
  });
  it('identiques : tout juste', () => {
    expect(comparerCode('7358', '7358').every((x) => x.ok)).toBe(true);
  });
});
