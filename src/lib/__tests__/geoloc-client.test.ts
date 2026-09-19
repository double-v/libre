/**
 * Parcours « Activer ma géolocalisation » (#400) : chaque échec doit dire la
 * vérité. Avant, tout error.code affichait « refusée » et un 200 {invisible}
 * ne disait rien du tout.
 */
import { describe, it, expect, vi } from 'vitest';
import { haversineDistance } from '@/lib/geoloc';
import {
  classifyGeolocError,
  geolocFailureMessage,
  geolocUpdateMessage,
  fuzzedPosition,
  geolocFallbackPrompt,
} from '@/lib/geoloc-client';

describe('classifyGeolocError', () => {
  it('distingue refus, indisponible et délai dépassé', () => {
    expect(classifyGeolocError({ code: 1 })).toBe('denied');
    expect(classifyGeolocError({ code: 2 })).toBe('unavailable');
    expect(classifyGeolocError({ code: 3 })).toBe('timeout');
  });

  it('classe un code inconnu en indisponible, jamais en refus', () => {
    expect(classifyGeolocError({ code: 42 })).toBe('unavailable');
  });
});

describe('geolocFailureMessage', () => {
  it("ne parle d'autoriser l'accès que sur un refus explicite", () => {
    expect(geolocFailureMessage('denied')).toMatch(/autoris/i);
    expect(geolocFailureMessage('unavailable')).not.toMatch(/autoris|refus/i);
    expect(geolocFailureMessage('timeout')).not.toMatch(/autoris|refus/i);
    expect(geolocFailureMessage('unsupported')).not.toMatch(/autoris|refus/i);
  });

  it('a une copie distincte par cas', () => {
    const all = (['denied', 'unavailable', 'timeout', 'unsupported'] as const).map(geolocFailureMessage);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('geolocUpdateMessage', () => {
  it('explique le mode invisible au lieu de se taire', () => {
    expect(geolocUpdateMessage({ throttled: true, invisible: true })).toMatch(/invisible/i);
  });

  it('reste muet quand la position est enregistrée ou déjà fraîche', () => {
    expect(geolocUpdateMessage({ crossings: [] })).toBeNull();
    expect(geolocUpdateMessage({ throttled: true })).toBeNull();
  });
});

describe('fuzzedPosition (#401)', () => {
  // Promesse de GeolocPromiseCard : « ta position est brouillée sur ton
  // appareil avant d'être envoyée ». Le serveur ne doit jamais voir la
  // position brute, même à 2 décimales près il la reçoit d'abord en clair.
  const raw = { latitude: 48.8566123, longitude: 2.3522154 };

  it("envoie autre chose que les coordonnées brutes", () => {
    // Octets fixés : angle 45° et distance max → les deux axes bougent, déterministe.
    const spy = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((arr) => {
      (arr as Uint8Array).set([32, 255]);
      return arr;
    });
    try {
      const sent = fuzzedPosition(raw);
      expect(sent.latitude).not.toBe(raw.latitude);
      expect(sent.longitude).not.toBe(raw.longitude);
    } finally {
      spy.mockRestore();
    }
  });

  it('reste dans un rayon de 100 m (sans effet sur les croisements à 500 m)', () => {
    for (let i = 0; i < 50; i++) {
      const sent = fuzzedPosition(raw);
      const d = haversineDistance(raw.latitude, raw.longitude, sent.latitude, sent.longitude);
      expect(d).toBeLessThanOrEqual(100.5);
    }
  });
});

describe('geolocFallbackPrompt (#406, spec 004)', () => {
  it('propose la ville sur les quatre échecs de géolocalisation', () => {
    for (const kind of ['denied', 'unavailable', 'timeout', 'unsupported'] as const) {
      expect(geolocFallbackPrompt(kind)).toMatch(/ville/i);
    }
  });

  it('ne propose rien en mode invisible : la ville n’y changerait rien', () => {
    expect(geolocFallbackPrompt('invisible')).toBeNull();
  });
});
