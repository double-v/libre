/**
 * Parcours « Activer ma géolocalisation » (#400) : chaque échec doit dire la
 * vérité. Avant, tout error.code affichait « refusée » et un 200 {invisible}
 * ne disait rien du tout.
 */
import { describe, it, expect } from 'vitest';
import {
  classifyGeolocError,
  geolocFailureMessage,
  geolocUpdateMessage,
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
