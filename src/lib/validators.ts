import { z } from 'zod';

const VALID_REPORT_REASONS = ['harassment', 'spam', 'fake', 'inappropriate', 'other'] as const;

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(1).max(50),
});

export const profileUpdateSchema = z.object({
  bio: z.string().max(500),
  birthDate: z.string().datetime(),
  genderIdentity: z.string().min(1).max(50),
  orientation: z.array(z.string().max(30)).max(10),
  relationshipType: z.array(z.string().max(30)).max(10),
  interests: z.array(z.string().max(30)).max(20),
  socialLinks: z.record(z.string(), z.string()).optional(),
  photos: z.array(z.string().url()).max(6).optional(),
  maxDistanceKm: z.number().int().min(1).max(500),
  ageMin: z.number().int().min(18).max(99),
  ageMax: z.number().int().min(18).max(99),
}).refine((data) => data.ageMin <= data.ageMax, {
  message: 'ageMin must be less than or equal to ageMax',
  path: ['ageMin'],
});

export const likeSchema = z.object({
  likedId: z.string().uuid(),
});

export const reportSchema = z.object({
  reportedId: z.string().uuid(),
  reason: z.enum(VALID_REPORT_REASONS),
  description: z.string().max(1000).default(''),
});

export const messageSchema = z.object({
  content: z.string().min(1).max(1000),
});

export const geolocUpdateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const verificationRequestSchema = z.object({
  selfieUrl: z.string().url(),
});

export const blockSchema = z.object({
  blockedId: z.string().uuid(),
});