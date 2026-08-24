/**
 * Tests — horloge du reset de La Place (#13).
 *
 * Le bandeau comptait vers 3h locales, le cron était déclaré à 2h UTC, et le
 * reset ne tournait pas du tout. Une fois le reset piloté par le trafic, cette
 * horloge devient la référence commune : elle se teste seule.
 */
import { describe, it, expect } from 'vitest';
import {
  SQUARE_RESET_HOUR_UTC,
  lastResetBoundary,
  nextResetBoundary,
  msUntilNextReset,
} from '../reset-clock';

describe('lastResetBoundary', () => {
  it('renvoie la borne du jour quand l’heure est passée', () => {
    const borne = lastResetBoundary(new Date('2026-08-24T09:30:00Z'));
    expect(borne.toISOString()).toBe('2026-08-24T02:00:00.000Z');
  });

  it('renvoie la borne de la veille juste avant l’heure', () => {
    const borne = lastResetBoundary(new Date('2026-08-24T01:59:59Z'));
    expect(borne.toISOString()).toBe('2026-08-23T02:00:00.000Z');
  });

  it('bascule pile à l’heure', () => {
    const borne = lastResetBoundary(new Date('2026-08-24T02:00:00Z'));
    expect(borne.toISOString()).toBe('2026-08-24T02:00:00.000Z');
  });

  it('passe correctement un changement de mois', () => {
    const borne = lastResetBoundary(new Date('2026-09-01T00:10:00Z'));
    expect(borne.toISOString()).toBe('2026-08-31T02:00:00.000Z');
  });

  it('reste en UTC quel que soit le passage à l’heure d’hiver', () => {
    // Le dernier dimanche d'octobre, l'Europe recule d'une heure : une borne
    // calculée en heure locale sauterait ou doublerait ce jour-là.
    const avant = lastResetBoundary(new Date('2026-10-25T01:30:00Z'));
    const apres = lastResetBoundary(new Date('2026-10-25T03:30:00Z'));
    expect(avant.toISOString()).toBe('2026-10-24T02:00:00.000Z');
    expect(apres.toISOString()).toBe('2026-10-25T02:00:00.000Z');
  });
});

describe('nextResetBoundary / msUntilNextReset', () => {
  it('vise toujours un instant strictement futur', () => {
    for (const iso of ['2026-08-24T01:59:59Z', '2026-08-24T02:00:00Z', '2026-08-24T23:00:00Z']) {
      const maintenant = new Date(iso);
      expect(nextResetBoundary(maintenant).getTime()).toBeGreaterThan(maintenant.getTime());
      expect(msUntilNextReset(maintenant)).toBeGreaterThan(0);
    }
  });

  it('ne dépasse jamais 24 h', () => {
    expect(msUntilNextReset(new Date('2026-08-24T02:00:01Z'))).toBeLessThanOrEqual(86_400_000);
  });

  it('expose l’heure déclarée dans vercel.json', () => {
    expect(SQUARE_RESET_HOUR_UTC).toBe(2);
  });
});
