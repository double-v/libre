import { describe, it, expect } from 'vitest';
import {
  fuzzLocation,
  haversineDistance,
  roundDistance,
  isWithinRadius,
} from '@/lib/geoloc';

describe('Geolocation utilities', () => {
  describe('fuzzLocation', () => {
    it('fuzzes a location to approximately 100m accuracy', () => {
      const lat = 48.8566;
      const lng = 2.3522;
      const fuzzed = fuzzLocation(lat, lng);

      const dist = haversineDistance(lat, lng, fuzzed.lat, fuzzed.lng);
      expect(dist).toBeLessThan(150);
      expect(dist).toBeGreaterThan(0);
    });

    it('produces different results each time (randomization)', () => {
      const results = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const fuzzed = fuzzLocation(48.8566, 2.3522);
        results.add(`${fuzzed.lat},${fuzzed.lng}`);
      }
      expect(results.size).toBeGreaterThan(1);
    });
  });

  describe('haversineDistance', () => {
    it('calculates distance between Paris and Lyon correctly', () => {
      const dist = haversineDistance(48.8566, 2.3522, 45.7640, 4.8357);
      expect(dist).toBeGreaterThan(390000);
      expect(dist).toBeLessThan(410000);
    });

    it('returns 0 for identical points', () => {
      expect(haversineDistance(48.8566, 2.3522, 48.8566, 2.3522)).toBe(0);
    });
  });

  describe('roundDistance', () => {
    it('rounds to nearest 50m for distances under 1km', () => {
      expect(roundDistance(234)).toBe(250);
      expect(roundDistance(49)).toBe(50);
    });

    it('rounds to nearest 100m for distances 1-10km', () => {
      expect(roundDistance(1234)).toBe(1200);
      expect(roundDistance(5600)).toBe(5600);
    });

    it('rounds to nearest 500m for distances over 10km', () => {
      expect(roundDistance(12345)).toBe(12500);
    });
  });

  describe('isWithinRadius', () => {
    it('returns true for points within radius', () => {
      expect(isWithinRadius(48.8566, 2.3522, 48.8570, 2.3530, 50)).toBe(true);
    });

    it('returns false for points outside radius', () => {
      expect(isWithinRadius(48.8566, 2.3522, 45.7640, 4.8357, 50)).toBe(false);
    });
  });
});