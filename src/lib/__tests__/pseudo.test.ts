/**
 * Tests — règle du pseudo (#459).
 *
 * Le pseudo est lu par tout le monde : il ne doit porter ni adresse, ni lien,
 * ni numéro, ni caractère qui trompe l'œil. Toutes les écritures (inscription,
 * renommage) passent par `validatePseudo` ; la migration applique la même
 * règle une fois aux comptes existants.
 */
import { describe, it, expect } from 'vitest';
import { normalizePseudo, validatePseudo, PSEUDO_MIN, PSEUDO_MAX } from '../pseudo';

describe('normalizePseudo', () => {
  it('retire les espaces aux bords et fusionne les espaces multiples', () => {
    expect(normalizePseudo('  Anne   Marie  ')).toBe('Anne Marie');
  });

  it('compose l\'Unicode (NFC) : un « é » décomposé devient un seul caractère', () => {
    expect(normalizePseudo('José')).toBe('José');
  });
});

describe('validatePseudo — accepte', () => {
  it.each([
    'Camille',
    'Jean-Marc',
    "O'Neil",
    'O’Neil',
    'marie.l',
    'sam_92',
    'Zoë',
    'Ангелина',
    '李娜',
    'Anne Marie',
  ])('%s', (p) => {
    expect(validatePseudo(p)).toEqual({ ok: true, value: normalizePseudo(p) });
  });
});

describe('validatePseudo — refuse', () => {
  it.each([
    ['camille.durand@gmail.com', 'contact'],
    ['@camille_lyon', 'contact'],
    ['camille@', 'contact'],
    ['camille.fr', 'contact'],
    ['www.camille', 'contact'],
    ['snap camille.me', 'contact'],
    ['camille 0612345678', 'contact'],
    ['camille 06 12 34 56 78', 'contact'],
    ['Cam*ille', 'caracteres'],
    ['Camille, Lyon', 'caracteres'],
    ['Camille ❤', 'caracteres'],
    ['<script>', 'caracteres'],
    ['Cam​ille', 'caracteres'],
    ['Cam‮ille', 'caracteres'],
    ['A', 'longueur'],
    ['   ', 'longueur'],
    ['x'.repeat(31), 'longueur'],
    ['...', 'caracteres'],
  ])('%s → %s', (p, motif) => {
    expect(validatePseudo(p)).toMatchObject({ ok: false, motif });
  });

  it('borne la longueur après normalisation', () => {
    expect(PSEUDO_MIN).toBe(2);
    expect(PSEUDO_MAX).toBe(30);
    expect(validatePseudo(`  ${'a'.repeat(30)}  `)).toMatchObject({ ok: true });
  });

  it('chaque refus porte un message qui énonce la règle, sans chiffre de compte', () => {
    for (const p of ['a@b.fr', 'Cam*ille', 'A']) {
      const r = validatePseudo(p);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.message.length).toBeGreaterThan(10);
    }
  });
});

describe('inscription — registerSchema applique la règle', async () => {
  const { registerSchema } = await import('../validators');
  const base = {
    email: 'x@example.test',
    password: 'Motdepasse1!',
    birthDate: '1990-01-01',
    consentGiven: true,
  };

  it('refuse un pseudo qui contient une adresse, avec le message de la règle', () => {
    const r = registerSchema.safeParse({ ...base, displayName: 'camille@gmail.com' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toMatch(/e-mail/);
  });

  it('enregistre la forme normalisée', () => {
    const r = registerSchema.safeParse({ ...base, displayName: '  Anne   Marie ' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.displayName).toBe('Anne Marie');
  });
});
