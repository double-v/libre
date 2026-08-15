/**
 * Tests — bbox de préfiltre et tranches de distance (#327).
 *
 * Le point sensible n'est pas la formule mais son sens de sûreté : la bbox doit
 * toujours **englober** le disque (sinon on efface des profils du feed), et les
 * tranches ne doivent jamais laisser deviner un kilométrage précis.
 */
import { describe, it, expect } from 'vitest';
import { boundingBox, distanceBucket, distanceBucketLabel } from '../discover-distance';
import { haversineDistance } from '../geoloc';

describe('boundingBox', () => {
  it('englobe tout point situé dans le rayon (aucun profil perdu)', () => {
    const lat = 48.8566;
    const lng = 2.3522; // Paris
    const km = 25;
    const box = boundingBox(lat, lng, km);

    // 360 points sur le cercle de rayon exactement `km` : tous doivent tomber
    // dans la bbox, sinon le préfiltre SQL amputerait le feed.
    for (let deg = 0; deg < 360; deg += 1) {
      const angle = (deg * Math.PI) / 180;
      const dLat = ((km / 6371) * Math.cos(angle) * 180) / Math.PI;
      const dLng = ((km / (6371 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle) * 180) / Math.PI;
      const pLat = lat + dLat;
      const pLng = lng + dLng;

      expect(pLat).toBeGreaterThanOrEqual(box.latMin);
      expect(pLat).toBeLessThanOrEqual(box.latMax);
      expect(pLng).toBeGreaterThanOrEqual(box.lngMin);
      expect(pLng).toBeLessThanOrEqual(box.lngMax);
    }
  });

  it('reste serrée : le coin de la bbox ne dépasse pas √2 fois le rayon', () => {
    const lat = 48.8566;
    const lng = 2.3522;
    const km = 25;
    const box = boundingBox(lat, lng, km);

    const cornerM = haversineDistance(lat, lng, box.latMax, box.lngMax);
    expect(cornerM / 1000).toBeLessThanOrEqual(km * Math.SQRT2 * 1.02);
  });

  it('élargit la longitude au globe entier près des pôles', () => {
    const box = boundingBox(89.999999, 0, 50);
    expect(box.lngMin).toBe(-180);
    expect(box.lngMax).toBe(180);
  });

  it('élargit la longitude au globe entier plutôt que de couper à l\'antiméridien', () => {
    const box = boundingBox(0, 179.9, 100);
    expect(box.lngMin).toBe(-180);
    expect(box.lngMax).toBe(180);
  });

  it('clampe la latitude à ±90', () => {
    const box = boundingBox(89, 0, 500);
    expect(box.latMax).toBeLessThanOrEqual(90);
    expect(boundingBox(-89, 0, 500).latMin).toBeGreaterThanOrEqual(-90);
  });
});

describe('distanceBucket', () => {
  it('range chaque distance dans sa tranche', () => {
    expect(distanceBucket(0)).toBe('lt1');
    expect(distanceBucket(0.4)).toBe('lt1');
    expect(distanceBucket(1)).toBe('1-3');
    expect(distanceBucket(2.9)).toBe('1-3');
    expect(distanceBucket(3)).toBe('3-5');
    expect(distanceBucket(9.99)).toBe('5-10');
    expect(distanceBucket(10)).toBe('10-20');
    expect(distanceBucket(20)).toBe('20-50');
    expect(distanceBucket(49.9)).toBe('20-50');
    expect(distanceBucket(50)).toBe('gt50');
    expect(distanceBucket(1200)).toBe('gt50');
  });

  it('ne distingue pas deux positions proches dans la même tranche (anti-trilatération)', () => {
    expect(distanceBucket(21)).toBe(distanceBucket(49));
  });
});

describe('distanceBucketLabel', () => {
  it('rend un libellé français pour une tranche connue', () => {
    expect(distanceBucketLabel('lt1')).toBe("moins d'1 km");
    expect(distanceBucketLabel('20-50')).toBe('20–50 km');
  });

  it('rend null sur une valeur absente ou inconnue', () => {
    expect(distanceBucketLabel(undefined)).toBeNull();
    expect(distanceBucketLabel('n_importe_quoi')).toBeNull();
  });
});
