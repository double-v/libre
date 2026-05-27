import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  profileUpdateSchema,
  likeSchema,
  reportSchema,
  messageSchema,
  geolocUpdateSchema,
  verificationRequestSchema,
  blockSchema,
} from '@/lib/validators';

describe('Validation schemas', () => {
  describe('registerSchema', () => {
    it('validates a correct registration', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'SecurePass123!',
        displayName: 'Alice',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = registerSchema.safeParse({
        email: 'not-an-email',
        password: 'SecurePass123!',
        displayName: 'Alice',
      });
      expect(result.success).toBe(false);
    });

    it('rejects short password', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'short',
        displayName: 'Alice',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty displayName', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'SecurePass123!',
        displayName: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('profileUpdateSchema', () => {
    it('validates a profile update', () => {
      const result = profileUpdateSchema.safeParse({
        bio: 'Hello!',
        birthDate: '1995-06-15T00:00:00Z',
        genderIdentity: 'non-binary',
        orientation: ['pansexuel'],
        relationshipType: ['poly'],
        interests: ['musique', 'rando'],
        maxDistanceKm: 30,
        ageMin: 20,
        ageMax: 40,
      });
      expect(result.success).toBe(true);
    });

    it('rejects age range where min > max', () => {
      const result = profileUpdateSchema.safeParse({
        bio: 'Hello!',
        birthDate: '1995-06-15T00:00:00Z',
        genderIdentity: 'non-binary',
        orientation: [],
        relationshipType: [],
        interests: [],
        maxDistanceKm: 50,
        ageMin: 40,
        ageMax: 20,
      });
      expect(result.success).toBe(false);
    });

    it('rejects bio over 500 chars', () => {
      const result = profileUpdateSchema.safeParse({
        bio: 'a'.repeat(501),
        birthDate: '1995-06-15T00:00:00Z',
        genderIdentity: 'non-binary',
        orientation: [],
        relationshipType: [],
        interests: [],
        maxDistanceKm: 50,
        ageMin: 18,
        ageMax: 99,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('likeSchema', () => {
    it('validates a like', () => {
      const result = likeSchema.safeParse({ likedId: '550e8400-e29b-41d4-a716-446655440000' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid UUID', () => {
      const result = likeSchema.safeParse({ likedId: 'not-a-uuid' });
      expect(result.success).toBe(false);
    });
  });

  describe('reportSchema', () => {
    it('validates a report', () => {
      const result = reportSchema.safeParse({
        reportedId: '550e8400-e29b-41d4-a716-446655440000',
        reason: 'harassment',
        description: 'User sent threatening messages',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid reason', () => {
      const result = reportSchema.safeParse({
        reportedId: '550e8400-e29b-41d4-a716-446655440000',
        reason: 'invalid-reason',
        description: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('messageSchema', () => {
    it('validates a message under 1000 chars', () => {
      const result = messageSchema.safeParse({ content: 'Hello!' });
      expect(result.success).toBe(true);
    });

    it('rejects empty message', () => {
      const result = messageSchema.safeParse({ content: '' });
      expect(result.success).toBe(false);
    });

    it('rejects message over 1000 chars', () => {
      const result = messageSchema.safeParse({ content: 'a'.repeat(1001) });
      expect(result.success).toBe(false);
    });
  });

  describe('geolocUpdateSchema', () => {
    it('validates a location update', () => {
      const result = geolocUpdateSchema.safeParse({
        latitude: 48.8566,
        longitude: 2.3522,
      });
      expect(result.success).toBe(true);
    });

    it('rejects latitude out of range', () => {
      const result = geolocUpdateSchema.safeParse({
        latitude: 91,
        longitude: 2.3522,
      });
      expect(result.success).toBe(false);
    });

    it('rejects longitude out of range', () => {
      const result = geolocUpdateSchema.safeParse({
        latitude: 48.8566,
        longitude: 181,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('verificationRequestSchema', () => {
    it('validates a verification request', () => {
      const result = verificationRequestSchema.safeParse({
        selfieUrl: 'https://r2.example.com/selfie.jpg',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid URL', () => {
      const result = verificationRequestSchema.safeParse({
        selfieUrl: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('blockSchema', () => {
    it('validates a block', () => {
      const result = blockSchema.safeParse({
        blockedId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid UUID', () => {
      const result = blockSchema.safeParse({
        blockedId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });
  });
});