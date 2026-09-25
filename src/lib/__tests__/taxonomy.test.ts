/**
 * Tests — liste des intentions (spec 008, #453).
 *
 * Une seule liste sert à se déclarer et à filtrer (#409). « je verrai en
 * chemin » y figure pour qu'on ne force aucune étiquette : sans elle, la
 * réciprocité miroir obligerait à se ranger dans une case pour lire celle des
 * autres.
 */
import { describe, it, expect } from 'vitest';
import { RELATIONSHIP_TYPE_OPTIONS } from '../taxonomy';

describe('RELATIONSHIP_TYPE_OPTIONS', () => {
  it('propose une réponse d\'indécision, distincte de « autre »', () => {
    expect(RELATIONSHIP_TYPE_OPTIONS).toContain('je verrai en chemin');
    expect(RELATIONSHIP_TYPE_OPTIONS).toContain('autre');
  });

  it('ne contient que des valeurs acceptées par le validateur (≤ 30 caractères)', () => {
    for (const v of RELATIONSHIP_TYPE_OPTIONS) expect(v.length).toBeLessThanOrEqual(30);
  });
});
