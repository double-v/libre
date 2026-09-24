/**
 * cleDepuisUrl (#442) — l'inverse de `photoUrl`, pour les surfaces qui ne
 * reçoivent que l'URL du proxy (file de vérification).
 */
import { describe, it, expect } from 'vitest';
import { cleDepuisUrl, photoUrl } from '../photos';

describe('cleDepuisUrl', () => {
  it('retrouve la clé R2 derrière l’URL du proxy', () => {
    for (const cle of ['u1/a.jpg', 'u1/photo a+b.png']) expect(cleDepuisUrl(photoUrl(cle))).toBe(cle);
  });

  it('rend null pour une URL qui n’est pas le proxy (donnée héritée, vide)', () => {
    expect(cleDepuisUrl('https://ailleurs.example/a.jpg')).toBeNull();
    expect(cleDepuisUrl('')).toBeNull();
    expect(cleDepuisUrl('/api/photos/%E0%A4%A')).toBeNull();
  });
});
