/**
 * Tests unitaires — Validators des opérations de Check-in.
 *
 * Cf. docs/roadmap/chantiers/01-securite/plan.md tâche 2.1.
 */
import { describe, it, expect } from 'vitest';
import {
  startCheckinSchema,
  validateCheckinSchema,
  cancelCheckinSchema,
  getActiveCheckinSchema,
  CHECKIN_DURATIONS,
} from '../checkin-validators';

describe('startCheckinSchema', () => {
  it.each(CHECKIN_DURATIONS)('accepte la durée %d minutes', (duration) => {
    const result = startCheckinSchema.safeParse({ durationMinutes: duration });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.durationMinutes).toBe(duration);
    }
  });

  it('rejette une durée arbitraire (33 min)', () => {
    const result = startCheckinSchema.safeParse({ durationMinutes: 33 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain(
        'Durée invalide. Valeurs acceptées : 30, 60, 120, 240, 480 minutes.',
      );
    }
  });

  it('rejette une durée négative', () => {
    const result = startCheckinSchema.safeParse({ durationMinutes: -10 });
    expect(result.success).toBe(false);
  });

  it('rejette une durée 0', () => {
    const result = startCheckinSchema.safeParse({ durationMinutes: 0 });
    expect(result.success).toBe(false);
  });

  it('rejette une durée float', () => {
    const result = startCheckinSchema.safeParse({ durationMinutes: 30.5 });
    expect(result.success).toBe(false);
  });

  it('rejette si durationMinutes manquant', () => {
    const result = startCheckinSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejette une string (anti type confusion)', () => {
    const result = startCheckinSchema.safeParse({ durationMinutes: '60' });
    expect(result.success).toBe(false);
  });

  it('rejette les champs V2 hypothétiques (strict)', () => {
    // Si un jour on ajoute un champ "alertMessage" ou autre, le test
    // cassera et on saura qu'il faut mettre à jour le validator.
    const result = startCheckinSchema.safeParse({
      durationMinutes: 60,
      extraField: 'x',
    });
    expect(result.success).toBe(false);
  });
});

describe('validateCheckinSchema', () => {
  it('accepte un body vide', () => {
    const result = validateCheckinSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejette les champs supplémentaires (placeholder)', () => {
    const result = validateCheckinSchema.safeParse({ foo: 'bar' });
    expect(result.success).toBe(false);
  });
});

describe('cancelCheckinSchema', () => {
  it('accepte un body vide', () => {
    const result = cancelCheckinSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejette les champs supplémentaires', () => {
    const result = cancelCheckinSchema.safeParse({ reason: 'changed my mind' });
    expect(result.success).toBe(false);
  });
});

describe('getActiveCheckinSchema', () => {
  it('accepte un body vide', () => {
    const result = getActiveCheckinSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('CHECKIN_DURATIONS (constante partagée)', () => {
  it('contient exactement 5 valeurs', () => {
    expect(CHECKIN_DURATIONS).toHaveLength(5);
  });

  it('valeurs triées croissantes', () => {
    const sorted = [...CHECKIN_DURATIONS].sort((a, b) => a - b);
    expect(CHECKIN_DURATIONS).toEqual(sorted);
  });

  it('toutes les valeurs sont positives', () => {
    for (const d of CHECKIN_DURATIONS) {
      expect(d).toBeGreaterThan(0);
    }
  });
});
