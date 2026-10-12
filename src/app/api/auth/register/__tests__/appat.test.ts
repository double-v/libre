/**
 * Tests — garde-fous anti-robot de POST /api/auth/register (#515).
 *
 * Le champ-appât rempli et la soumission quasi instantanée refusent
 * l'inscription d'un robot scripté. Une personne réelle ne devrait jamais
 * passer ici : le test veille aussi à ce que les deux motifs répondent le
 * même message, et à ce que rien ne parte en base.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/server', async (importOriginal) => {
  const orig = await importOriginal<typeof import('next/server')>();
  return { ...orig, after: () => {} };
});

const mockSendVerificationEmail = vi.fn();
vi.mock('@/lib/email-send', () => ({ __esModule: true, sendVerificationEmail: mockSendVerificationEmail }));
vi.mock('@/lib/verify-token', () => ({ __esModule: true, createVerificationToken: vi.fn().mockResolvedValue('fake-verify-token') }));

import { randomUUID } from 'crypto';
const fakeDb = {
  user: {
    count: vi.fn().mockResolvedValue(0),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({
      id: randomUUID(),
      email: 'test@example.com',
      displayName: 'TestUser',
      createdAt: new Date(),
      isVerified: false,
    }),
  },
  consent: { createMany: vi.fn().mockResolvedValue({ count: 3 }) },
};
vi.mock('@/lib/db', () => ({ __esModule: true, getDb: () => fakeDb }));

vi.mock('@/lib/rate-limit', () => ({
  __esModule: true,
  rateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 59, resetAt: Date.now() + 60_000 }),
  limits: { auth: { limit: 5, windowMs: 60_000 } },
}));
vi.mock('@/lib/client-ip', () => ({ __esModule: true, getClientIp: vi.fn().mockReturnValue('127.0.0.1') }));

const { POST } = await import('../route');

const VALID_BODY = {
  email: 'test@example.com',
  password: 'ValidPass1!',
  displayName: 'TestUser',
  birthDate: '1990-01-01',
  consentGiven: true,
};

function buildRequest(overrides: Record<string, unknown> = {}): Request {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ ...VALID_BODY, ...overrides }),
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSendVerificationEmail.mockResolvedValue(undefined);
});

const DEV = { TURNSTILE_SECRET_KEY: '' };

describe('garde-fous anti-robot à l\'inscription (#515)', () => {
  it('champ-appât rempli → refus 403, aucun compte créé, log sans PII', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await POST(buildRequest({ fax: 'https://spam.exemple' }));
    expect(res.status).toBe(403);
    expect(fakeDb.user.create).not.toHaveBeenCalled();
    expect(warn.mock.calls[0][0]).toBe('fraude.inscription.appat');
    // Seul le motif sort : ni la valeur, ni qui la porte.
    expect(warn.mock.calls[0][1]).toEqual({ motif: 'champ' });
    warn.mockRestore();
  });

  it('soumission quasi instantanée → même refus, même message', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const a = await POST(buildRequest({ fax: 'trop vite' }));
    const b = await POST(buildRequest({ tms: 10 }));
    const msgA = (await a.json()).error;
    const msgB = (await b.json()).error;
    expect(a.status).toBe(403);
    expect(b.status).toBe(403);
    expect(msgA).toBe(msgB);
  });

  it('temps plausible ou absent → l\'inscription passe', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect((await POST(buildRequest({ tms: 4_000 }))).status).toBe(201);
    expect((await POST(buildRequest(VALID_BODY))).status).toBe(201);
    expect((await POST(buildRequest({ tms: 90_000_000 }))).status).toBe(201);
  });
});