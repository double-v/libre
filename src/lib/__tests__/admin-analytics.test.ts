import { describe, it, expect } from 'vitest';
import {
  cutoffDate,
  computeAgeBucket,
  withOtherBucket,
  countValue,
} from '@/lib/admin-analytics';

describe('cutoffDate', () => {
  it('renvoie une date située il y a environ N jours', () => {
    const now = Date.now();
    const d = cutoffDate(7);
    expect(d.getTime()).toBeLessThan(now);
    expect(d.getTime()).toBeGreaterThan(now - 8 * 24 * 60 * 60 * 1000);
  });
});

describe('computeAgeBucket', () => {
  it('classe un 20 ans dans 18-25 ans', () => {
    const birth = new Date();
    birth.setFullYear(birth.getFullYear() - 20);
    expect(computeAgeBucket(birth)).toBe('18-25 ans');
  });

  it('classe un 40 ans dans 36-45 ans', () => {
    const birth = new Date();
    birth.setFullYear(birth.getFullYear() - 40);
    expect(computeAgeBucket(birth)).toBe('36-45 ans');
  });

  it('classe un mineur dans la tranche dédiée', () => {
    const birth = new Date();
    birth.setFullYear(birth.getFullYear() - 16);
    expect(computeAgeBucket(birth)).toBe('Moins de 18 ans');
  });

  it('classe un senior dans la dernière tranche', () => {
    const birth = new Date();
    birth.setFullYear(birth.getFullYear() - 62);
    expect(computeAgeBucket(birth)).toBe('56 ans et +');
  });
});

describe('withOtherBucket', () => {
  it('regroupe les valeurs au-delà du top N sous Autre', () => {
    const items = [
      { value: 'A', count: 50 },
      { value: 'B', count: 30 },
      { value: 'C', count: 15 },
      { value: 'D', count: 5 },
    ];
    const result = withOtherBucket(items, 2);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ value: 'A', count: 50, percent: 50 });
    expect(result[1]).toEqual({ value: 'B', count: 30, percent: 30 });
    expect(result[2]).toEqual({ value: 'Autre', count: 20, percent: 20 });
  });

  it('renvoie un tableau vide si le total est nul', () => {
    expect(withOtherBucket([], 3)).toEqual([]);
  });

  it('ne crée pas de ligne Autre si toutes les valeurs rentrent dans le top', () => {
    const items = [
      { value: 'A', count: 60 },
      { value: 'B', count: 40 },
    ];
    const result = withOtherBucket(items, 5);
    expect(result).toHaveLength(2);
    expect(result.some((i) => i.value === 'Autre')).toBe(false);
  });
});

describe('countValue', () => {
  it('convertit un BigInt en number', () => {
    expect(countValue(BigInt(12))).toBe(12);
  });

  it('laisse passer un number', () => {
    expect(countValue(7)).toBe(7);
  });

  it('renvoie 0 pour une valeur inattendue', () => {
    expect(countValue(null)).toBe(0);
    expect(countValue(undefined)).toBe(0);
    expect(countValue('not a number')).toBeNaN();
  });
});
