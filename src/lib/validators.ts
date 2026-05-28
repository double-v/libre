import { z } from 'zod';
import { GENDER_OPTIONS } from '@/lib/taxonomy';

const VALID_REPORT_REASONS = ['harassment', 'spam', 'fake', 'inappropriate', 'other'] as const;

const MIN_AGE = 18;

function isAtLeast18(birthDateStr: string): boolean {
  const birthDate = new Date(birthDateStr);
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - MIN_AGE);
  return birthDate <= minDate;
}

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const VALID_GENDER_VALUES = GENDER_OPTIONS.map(g => g.value);

function normalizeGenderIdentity(v: string | undefined): string | undefined {
  if (v === undefined) return undefined;
  if (v === '') return '';
  const lower = v.toLowerCase();
  if ((VALID_GENDER_VALUES as string[]).includes(lower)) return lower;
  return 'autre';
}

export const registerSchema = z.object({
  email: z.string({ message: 'Veuillez entrer un email valide' }).email('Veuillez entrer un email valide'),
  password: z.string({ message: 'Veuillez entrer un mot de passe' }).regex(
    passwordRegex,
    '8 caractères min, avec majuscule, minuscule et chiffre',
  ),
  displayName: z.string({ message: 'Veuillez entrer un pseudo' }).min(1, 'Le pseudo est requis').max(50, 'Le pseudo ne peut pas dépasser 50 caractères').transform((s) => s.trim()),
  turnstileToken: z.string().nullable().optional(),
  deviceId: z.string().nullable().optional(),
});

export const profileUpdateSchema = z.object({
  bio: z.string().max(500).optional(),
  birthDate: z.string().datetime().refine(isAtLeast18, 'You must be at least 18 years old').optional(),
  genderIdentity: z.string().max(50).optional().transform(normalizeGenderIdentity),
  orientation: z.array(z.string().max(30)).max(10).optional(),
  relationshipType: z.array(z.string().max(30)).max(10).optional(),
  interests: z.array(z.string().max(30)).max(20).optional(),
  practices: z.array(z.string().max(30)).max(20).optional(),
  socialLinks: z.record(z.string(), z.string()).optional(),
  photos: z.array(z.string().url()).max(6).optional(),
  invisibleMode: z.boolean().optional(),
  maxDistanceKm: z.number().int().min(1).max(500).optional(),
  ageMin: z.number().int().min(18).max(99).optional(),
  ageMax: z.number().int().min(18).max(99).optional(),
}).refine((data) => {
  if (data.ageMin !== undefined && data.ageMax !== undefined) {
    return data.ageMin <= data.ageMax;
  }
  return true;
}, {
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
  selfieUrl: z.string().url().startsWith('https://', { message: 'selfieUrl must be HTTPS' }),
});

export const blockSchema = z.object({
  blockedId: z.string().uuid(),
});