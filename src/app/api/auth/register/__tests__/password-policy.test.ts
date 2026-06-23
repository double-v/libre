/**
 * Tests for password policy + email normalization consistency on
 * POST /api/auth/register.
 *
 * Issue #145:
 *  1. The password policy required min(8) + uppercase + lowercase + digit
 *     but NOT a special character. "Password1" was accepted.
 *  2. The register route computed `normalizedEmail` (Gmail dot/alias
 *     stripping, lowercasing) but then created the user and sent the
 *     verification email using `email.toLowerCase().trim()` — a weaker
 *     normalization. This allowed `Foo@bar.com` and `foo@bar.com` (or
 *     `user.name@gmail.com` / `username@gmail.com`) to slip past the
 *     duplicate check and create two separate accounts.
 *
 * The fix:
 *  - Password regex now also requires at least one special character.
 *  - The register route uses `normalizedEmail` everywhere (user.create,
 *    createVerificationToken, sendVerificationEmail).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { randomUUID } from 'crypto';
import { registerSchema } from '@/lib/validators';
import { normalizeEmail } from '@/lib/email';

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

const mockCreateVerificationToken = vi.fn();
vi.mock('@/lib/verify-token', () => ({
  __esModule: true,
  createVerificationToken: mockCreateVerificationToken,
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

// Import after mocks. No TURNSTILE_SECRET_KEY in env → captcha skipped.
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
  mockCreateVerificationToken.mockResolvedValue('fake-verify-token');
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
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Password policy (issue #145, part 1)
// ---------------------------------------------------------------------------

describe('Password policy — registerSchema (#145)', () => {
  it('rejects "12345678" (no uppercase, no special char)', () => {
    const parsed = registerSchema.safeParse({
      ...VALID_BODY,
      password: '12345678',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects "Password1" (no special character)', () => {
    const parsed = registerSchema.safeParse({
      ...VALID_BODY,
      password: 'Password1',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects "password1!" (no uppercase)', () => {
    const parsed = registerSchema.safeParse({
      ...VALID_BODY,
      password: 'password1!',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects "PASSWORD1!" (no lowercase)', () => {
    const parsed = registerSchema.safeParse({
      ...VALID_BODY,
      password: 'PASSWORD1!',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects "Pass!1" (too short, < 8 chars)', () => {
    const parsed = registerSchema.safeParse({
      ...VALID_BODY,
      password: 'Pass!1',
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts "Password1!" (uppercase + lowercase + digit + special + ≥8)', () => {
    const parsed = registerSchema.safeParse({
      ...VALID_BODY,
      password: 'Password1!',
    });
    expect(parsed.success).toBe(true);
  });

  it('returns a French error message mentioning caractère spécial', () => {
    const parsed = registerSchema.safeParse({
      ...VALID_BODY,
      password: 'Password1',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toMatch(/caractère spécial/i);
    }
  });
});

describe('Password policy — POST /api/auth/register (#145)', () => {
  it('rejects "12345678" with 400', async () => {
    const res = await POST(buildRequest({ password: '12345678' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/caractère spécial|majuscule|chiffre/i);
  });

  it('rejects "Password1" (no special char) with 400', async () => {
    const res = await POST(buildRequest({ password: 'Password1' }));
    expect(res.status).toBe(400);
  });

  it('accepts "Password1!" and creates the user', async () => {
    const res = await POST(buildRequest({ password: 'Password1!' }));
    expect(res.status).toBe(201);
    expect(fakeDb.user.create).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Email normalization consistency (issue #145, part 2)
// ---------------------------------------------------------------------------

describe('Email normalization consistency — POST /api/auth/register (#145)', () => {
  it('uses normalizedEmail when creating the user (not raw email.toLowerCase().trim())', async () => {
    await POST(buildRequest({ email: 'Foo@bar.com' }));

    const createCall = fakeDb.user.create.mock.calls[0];
    expect(createCall).toBeDefined();
    const data = createCall![0].data;
    // normalizeEmail('Foo@bar.com') === 'foo@bar.com'
    expect(data.email).toBe('foo@bar.com');
    expect(data.normalizedEmail).toBe('foo@bar.com');
  });

  it('uses normalizedEmail for the verification token and email send', async () => {
    await POST(buildRequest({ email: 'Foo@bar.com' }));

    expect(mockCreateVerificationToken).toHaveBeenCalledWith(
      expect.any(String),
      'foo@bar.com',
    );
    expect(mockSendVerificationEmail).toHaveBeenCalledWith(
      'foo@bar.com',
      expect.any(String),
    );
  });

  it('checks existing account by normalizedEmail', async () => {
    await POST(buildRequest({ email: 'Foo@bar.com' }));

    expect(fakeDb.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { normalizedEmail: 'foo@bar.com' } }),
    );
  });

  it('prevents duplicate account when Foo@bar.com already exists and foo@bar.com is submitted', async () => {
    // Simulate an existing user keyed by normalizedEmail === 'foo@bar.com'
    fakeDb.user.findUnique.mockResolvedValue({
      id: randomUUID(),
      normalizedEmail: 'foo@bar.com',
    });

    const res = await POST(buildRequest({ email: 'foo@bar.com' }));

    expect(res.status).toBe(409);
    expect(fakeDb.user.create).not.toHaveBeenCalled();
  });

  it('prevents duplicate account across Foo@bar.com and foo@bar.com (normalizeEmail lowercases)', async () => {
    // Confirm the helper itself treats them as equal — this is the
    // invariant the route now relies on instead of the weaker
    // `email.toLowerCase().trim()`.
    expect(normalizeEmail('Foo@bar.com')).toBe(normalizeEmail('foo@bar.com'));

    // Second registration attempt must hit the duplicate guard.
    fakeDb.user.findUnique.mockResolvedValue({
      id: randomUUID(),
      normalizedEmail: 'foo@bar.com',
    });

    const res = await POST(buildRequest({ email: 'Foo@bar.com' }));
    expect(res.status).toBe(409);
    expect(fakeDb.user.create).not.toHaveBeenCalled();
  });

  it('treats u.s.e.r+tag@gmail.com and user@gmail.com as the same account', async () => {
    // Gmail dot/alias stripping means these two normalize to the same key.
    expect(normalizeEmail('u.s.e.r+tag@gmail.com')).toBe('user@gmail.com');

    fakeDb.user.findUnique.mockResolvedValue({
      id: randomUUID(),
      normalizedEmail: 'user@gmail.com',
    });

    const res = await POST(buildRequest({ email: 'u.s.e.r+tag@gmail.com' }));
    expect(res.status).toBe(409);
    expect(fakeDb.user.create).not.toHaveBeenCalled();
  });
});