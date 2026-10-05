import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hmacIdentite } from '../empreinte-identite';

const avant = process.env.NEXTAUTH_SECRET;
beforeEach(() => { process.env.NEXTAUTH_SECRET = 'secret-de-test'; });
afterEach(() => { process.env.NEXTAUTH_SECRET = avant; });

describe('hmacIdentite', () => {
  it('même entrée, même empreinte : la correspondance avec un banni reste possible', () => {
    expect(hmacIdentite('email', 'lola@example.test')).toBe(hmacIdentite('email', 'lola@example.test'));
  });

  it('ne contient jamais la valeur en clair', () => {
    const h = hmacIdentite('email', 'lola@example.test')!;
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain('lola');
  });

  it('sépare les usages : la même valeur donne une empreinte différente par sorte', () => {
    expect(hmacIdentite('appareil', 'abc')).not.toBe(hmacIdentite('ip', 'abc'));
  });

  it('dépend du secret serveur : sans lui, une empreinte ne se recalcule pas par dictionnaire', () => {
    const a = hmacIdentite('email', 'lola@example.test');
    process.env.NEXTAUTH_SECRET = 'autre-secret';
    expect(hmacIdentite('email', 'lola@example.test')).not.toBe(a);
  });

  it('rend null sur une valeur vide ou sans secret', () => {
    expect(hmacIdentite('appareil', '')).toBeNull();
    expect(hmacIdentite('appareil', null)).toBeNull();
    delete process.env.NEXTAUTH_SECRET;
    expect(hmacIdentite('appareil', 'abc')).toBeNull();
  });
});
