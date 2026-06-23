/**
 * Tests for Turnstile captcha enforcement on POST /api/auth/register.
 *
 * Issue #144: Turnstile was bypassed on Vercel preview URLs because the
 * gate excluded `VERCEL_ENV === 'preview'`. Preview URLs are publicly
 * accessible and indexable, so a bot could spam account creation via a
 * preview deployment. The fix requires Turnstile whenever
 * TURNSTILE_SECRET_KEY is configured, regardless of the environment.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { randomUUID } from 'crypto';

// === Mocks ===

const mockVerifyTurnstile = vi.fn();
vi.mock('@/lib/turnstile', () => ({
  __esModule: true,
  verifyTurnstile: mockVerifyTurnstile,
}));

const mockSendVerificationEmail = vi.fn();
vi.mock('@/lib/email-send', () => ({
  __esModule: true,
  sendVerificationEmail: mockSendVerificationEmail,
}));

vi.mock('@/lib/verify-token', () => ({
  __esModule: true,
  createVerificationToken: vi.fn().mockResolvedValue('fake-verify-token'),
}));

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
  consent: {
    createMany: vi.fn().mockResolvedValue({ count: 3 }),
  },
};
vi.mock('@/lib/db', () => ({
  __esModule: true,
  getDb: () => fakeDb,
}));

vi.mock('@/lib/rate-limit', () => ({
  __esModule: true,
  rateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 59, resetAt: Date.now() + 60_000 }),
  limits: { auth: { limit: 5, windowMs: 60_000 } },
}));

vi.mock('@/lib/client-ip', () => ({
  __esModule: true,
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}));

// Import after mocks. The `requireTurnstile` check reads env vars at
// request time, so we don't need to re-import per test — just set the
// env vars before each request.
const { POST } = await import('../route');

const VALID_BODY = {
  email: 'test@example.com',
  password: 'ValidPass1!',
  displayName: 'TestUser',
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
  mockVerifyTurnstile.mockResolvedValue(true);
  mockSendVerificationEmail.mockResolvedValue(undefined);
  fakeDb.user.count.mockResolvedValue(0);
  fakeDb.user.findUnique.mockResolvedValue(null);
  fakeDb.user.create.mockResolvedValue({
    id: randomUUID(),
    email: 'test@example.com',
    displayName: 'TestUser',
    createdAt: new Date(),
    isVerified: false,
  });
});

afterEach(() => {
  // Clean up env vars after each test
  vi.unstubAllEnvs();
});

describe('Turnstile enforcement on /api/auth/register (#144)', () => {
  it('returns 400 when TURNSTILE_SECRET_KEY is set but no token is provided', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret-key');
    vi.stubEnv('TURNSTILE_SITE_KEY', 'site-key');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL_ENV', 'preview');

    const res = await POST(buildRequest({ turnstileToken: undefined }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/captcha/i);
    expect(mockVerifyTurnstile).not.toHaveBeenCalled();
  });

  it('passes registration when a valid Turnstile token is provided (key set, even on Vercel preview)', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret-key');
    vi.stubEnv('TURNSTILE_SITE_KEY', 'site-key');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL_ENV', 'preview');

    mockVerifyTurnstile.mockResolvedValue(true);

    const res = await POST(buildRequest({ turnstileToken: 'valid-turnstile-token' }));

    expect(res.status).toBe(201);
    expect(mockVerifyTurnstile).toHaveBeenCalledWith('valid-turnstile-token');
  });

  it('passes registration without a token when TURNSTILE_SECRET_KEY is NOT set (dev)', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', '');
    vi.stubEnv('TURNSTILE_SITE_KEY', '');
    vi.stubEnv('NODE_ENV', 'development');

    const res = await POST(buildRequest({ turnstileToken: undefined }));

    expect(res.status).toBe(201);
    expect(mockVerifyTurnstile).not.toHaveBeenCalled();
  });
});