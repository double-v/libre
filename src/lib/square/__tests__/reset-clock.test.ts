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
  formatCountdown,
  formatReopenClock,
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

describe('formatCountdown (#358)', () => {
  it('rend le compte à rebours du canvas', () => {
    // 4 h 12 — la forme dessinée dans LaPlace.dc.html.
    expect(formatCountdown(4 * 3_600_000 + 12 * 60_000)).toBe('4 h 12');
  });

  it('garde les minutes sur deux chiffres', () => {
    expect(formatCountdown(3 * 3_600_000 + 5 * 60_000)).toBe('3 h 05');
  });

  it('tronque plutôt que d’arrondir — le rebours ne doit jamais dépasser le réel', () => {
    // 59,9 s restantes s'annoncent « 0 h 00 », pas « 0 h 01 » : un compte à
    // rebours qui arrondit vers le haut promet du temps qui n'existe plus.
    expect(formatCountdown(59_900)).toBe('0 h 00');
  });

  it('ne rend jamais de valeur négative une fois la borne franchie', () => {
    expect(formatCountdown(-1)).toBe('0 h 00');
  });
});

describe('formatReopenClock (#358)', () => {
  it('rend l’heure serveur telle qu’elle est appliquée, pas une heure locale devinée', () => {
    // Le fond du bug de #13 : 2h UTC affichées comme « minuit » ou « 3h ».
    const midi = new Date('2026-08-24T12:00:00Z');
    expect(formatReopenClock(midi, 'UTC')).toBe('02:00');
    // Fin août, Paris est à UTC+2 : la même borne s'y lit 04:00.
    expect(formatReopenClock(midi, 'Europe/Paris')).toBe('04:00');
  });

  it('suit la borne de la veille quand l’heure du jour n’est pas encore passée', () => {
    const avant = new Date('2026-08-24T01:00:00Z');
    expect(formatReopenClock(avant, 'UTC')).toBe('02:00');
  });

  it('reste juste au passage à l’heure d’hiver', () => {
    // Le 25 octobre, Paris repasse à UTC+1 : la borne 2h UTC s'y lit 03:00,
    // là où elle se lisait 04:00 la veille.
    expect(formatReopenClock(new Date('2026-10-24T12:00:00Z'), 'Europe/Paris')).toBe('04:00');
    expect(formatReopenClock(new Date('2026-10-26T12:00:00Z'), 'Europe/Paris')).toBe('03:00');
  });
});
