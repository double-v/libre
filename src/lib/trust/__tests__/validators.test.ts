/**
 * Tests unitaires — Validators du Cercle de Confiance.
 *
 * Cf. docs/roadmap/chantiers/01-securite/plan.md tâche 1.2.
 */
import { describe, it, expect } from 'vitest';
import {
  addContactSchema,
  removeContactSchema,
  listContactsSchema,
} from '../validators';

const VALID_UUID_V4 = '550e8400-e29b-41d4-a716-446655440000';
const ANOTHER_VALID_UUID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

describe('addContactSchema (V1 = Libre-only)', () => {
  it('accepts a valid UUID', () => {
    const result = addContactSchema.safeParse({ contactId: VALID_UUID_V4 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contactId).toBe(VALID_UUID_V4);
    }
  });

  it('rejects missing contactId', () => {
    const result = addContactSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain('Identifiant utilisateur requis');
    }
  });

  it('rejects non-UUID contactId', () => {
    const result = addContactSchema.safeParse({ contactId: 'not-a-uuid' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain('Identifiant utilisateur invalide');
    }
  });

  it('rejects empty string', () => {
    const result = addContactSchema.safeParse({ contactId: '' });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields (V1 strict)', () => {
    // En V1 on n'accepte QUE contactId. Pas d'email, pas de phone.
    // Si on reçoit autre chose, c'est probablement une tentative
    // de re-activer le flow hors-app qu'on a explicitement reporté.
    const result = addContactSchema.safeParse({
      contactId: VALID_UUID_V4,
      email: 'evil@example.com',
    });
    expect(result.success).toBe(false);
  });
});

describe('removeContactSchema', () => {
  it('accepts a valid UUID', () => {
    const result = removeContactSchema.safeParse({
      contactId: VALID_UUID_V4,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing contactId', () => {
    const result = removeContactSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID contactId', () => {
    const result = removeContactSchema.safeParse({ contactId: 'abc' });
    expect(result.success).toBe(false);
  });
});

describe('listContactsSchema', () => {
  it('accepts empty object', () => {
    const result = listContactsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects extra fields (placeholder for future filters)', () => {
    // Si on ajoute un filter `?since=...` plus tard, on enlèvera
    // le .strict() ou on ajoutera le champ ici.
    const result = listContactsSchema.safeParse({ foo: 'bar' });
    expect(result.success).toBe(false);
  });
});

describe('regression — V1 Libre-only invariants', () => {
  it('addContactSchema n\'accepte PAS contactEmail (V1 = Libre-only)', () => {
    const result = addContactSchema.safeParse({
      contactId: VALID_UUID_V4,
      contactEmail: 'test@example.com',
    });
    expect(result.success).toBe(false);
  });

  it('addContactSchema n\'accepte PAS contactPhone (V1 = Libre-only)', () => {
    const result = addContactSchema.safeParse({
      contactId: VALID_UUID_V4,
      contactPhone: '+33612345678',
    });
    expect(result.success).toBe(false);
  });

  it('addContactSchema n\'accepte PAS channel (V1 = Libre-only)', () => {
    const result = addContactSchema.safeParse({
      contactId: VALID_UUID_V4,
      channel: 'app',
    });
    expect(result.success).toBe(false);
  });

  it('deux UUIDs différents sont tous deux valides', () => {
    // Sanity check : le validator ne hardcode pas un seul UUID.
    const a = addContactSchema.safeParse({ contactId: VALID_UUID_V4 });
    const b = addContactSchema.safeParse({ contactId: ANOTHER_VALID_UUID });
    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.data.contactId).not.toBe(b.data.contactId);
    }
  });
});
