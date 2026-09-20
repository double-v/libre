/**
 * masquerEmail (#423) — la liste admin ne montre jamais une adresse entière.
 */
import { describe, it, expect } from 'vitest';
import { masquerEmail } from '@/lib/masquer-email';

describe('masquerEmail', () => {
  it('garde deux caractères de chaque côté et le TLD', () => {
    expect(masquerEmail('julie.martin@example.fr')).toBe('ju***@ex***.fr');
  });

  it('conserve le sous-domaine dans le TLD lisible', () => {
    expect(masquerEmail('paul@mail.example.co.uk')).toBe('pa***@ma***.uk');
  });

  it("n'affiche qu'un caractère quand la partie est trop courte", () => {
    expect(masquerEmail('ab@cd.fr')).toBe('a***@c***.fr');
    expect(masquerEmail('a@b.fr')).toBe('a***@b***.fr');
  });

  it('ne révèle rien sur une valeur sans « @ »', () => {
    expect(masquerEmail('pas-une-adresse')).toBe('***');
    expect(masquerEmail('@example.fr')).toBe('***');
    expect(masquerEmail('')).toBe('***');
  });

  it('ne contient jamais la partie locale complète', () => {
    for (const adresse of ['julie.martin@example.fr', 'abc@example.fr', 'x.y.z@sub.example.org']) {
      const local = adresse.split('@')[0];
      expect(masquerEmail(adresse)).not.toContain(local);
    }
  });
});
