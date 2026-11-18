import { describe, expect, it } from 'vitest';
import { doitEcrirePresence, jourDePresence } from '../presence';

describe('présence au jour près (#498)', () => {
  const now = new Date('2026-10-13T15:42:00Z');

  it('ramène un instant à minuit UTC de son jour', () => {
    expect(jourDePresence(now).toISOString()).toBe('2026-10-13T00:00:00.000Z');
  });

  it.each([
    ['jamais vu', null, true],
    ['vu hier', new Date('2026-10-12T00:00:00Z'), true],
    ['déjà vu aujourd’hui', new Date('2026-10-13T00:00:00Z'), false],
  ])('%s → écrire : %s', (_cas, lastSeenAt, attendu) => {
    expect(doitEcrirePresence(lastSeenAt, now)).toBe(attendu);
  });
});
