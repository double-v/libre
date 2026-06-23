/**
 * Tests for token lifecycle on POST /api/auth/reset-password (#154).
 *
 * Verifies:
 * - Rate limited after too many requests
 * - Generic error message (no email enumeration)
 * - Token rejected after TTL expiry
 * - Token rejected after single use
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'crypto';
import { SignJWT } from 'jose';

// === Mocks ===

const mockVerifyResetToken = vi.fn();
vi.mock('@/lib/reset-token', () => ({
  __esModule: true,
  verifyResetToken: mockVerifyResetToken,
}));

vi.mock('@/lib/email', () => ({
  __esModule: true,
  normalizeEmail: (e: string) => e.toLowerCase(),
}));

vi.mock('@/lib/validators', () => ({
  __esModule: true,
  registerSchema: {
    shape: { password: { safeParse: (v: string) => ({ success: v.length >= 8 }) } },
  },
}));

vi.mock('@/lib/client-ip', () => ({
  __esModule: true,
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}));

// --- DB mock ---

const dbTokenStore = new Map<string, { id: string; tokenHash: string; usedAt: Date | null; expiresAt: Date }>();

const fakeDb = {
  passwordResetToken: {
    findUnique: vi.fn(({ where: { tokenHash } }: { where: { tokenHash: string } }) =>
      dbTokenStore.get(tokenHash) ?? null,
    ),
    update: vi.fn(({ where, data }: { where: { id: string }; data: { usedAt?: Date } }) => {
      const entry = [...dbTokenStore.values()].find((t) => t.id === where.id);
      if (entry && data.usedAt) entry.usedAt = data.usedAt;
      return Promise.resolve(entry);
    }),
  },
  user: {
    findUnique: vi.fn().mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      normalizedEmail: 'user@example.com',
      passwordHash: '$2a$12$oldhash',
    }),
    update: vi.fn().mockResolvedValue({}),
  },
  $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
};
vi.mock('@/lib/db', () => ({
  __esModule: true,
  getDb: () => fakeDb,
}));

// Import after mocks
const { POST } = await import('../route');

// --- Helpers ---

const SECRET = new TextEncoder().encode('test-secret');

function makeToken(expiresIn: string, payload: Record<string, unknown> = { userId: 'user-1', email: 'user@example.com', purpose: 'reset' }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(SECRET);
}

function buildRequest(token: string, password = 'ValidPass1!'): Request {
  return new Request('http://localhost/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
    headers: { 'Content-Type': 'application/json' },
  });
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Rate limit mock — mutable so individual tests can override the result.
const rateLimitState = {
  result: { success: true, remaining: 19, resetAt: Date.now() + 60_000 },
};
const { mockRateLimit } = vi.hoisted(() => ({
  mockRateLimit: vi.fn(),
}));
vi.mock('@/lib/rate-limit', () => ({
  __esModule: true,
  rateLimit: mockRateLimit,
  limits: { auth: { limit: 20, windowMs: 60_000 } },
}));

beforeEach(() => {
  vi.clearAllMocks();
  dbTokenStore.clear();
  // Default: verifyResetToken returns the payload
  mockVerifyResetToken.mockResolvedValue({ userId: 'user-1', email: 'user@example.com' });
  // Default: rateLimit allows the request
  rateLimitState.result = { success: true, remaining: 19, resetAt: Date.now() + 60_000 };
  mockRateLimit.mockImplementation(async () => rateLimitState.result);
});

// --- Tests ---

describe('Token lifecycle — reset-password (#154)', () => {
  it('returns 429 when rate limited after too many requests', async () => {
    rateLimitState.result = { success: false, remaining: 0, resetAt: Date.now() + 30_000 };

    const res = await POST(buildRequest('any-token'));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/tentatives/i);
  });

  it('returns the same generic error for invalid token and valid-but-not-found token (no enumeration)', async () => {
    // Token that verifyResetToken rejects
    mockVerifyResetToken.mockResolvedValue(null);

    const res1 = await POST(buildRequest('invalid-token'));
    const json1 = await res1.json();

    // Token that verifyResetToken accepts but DB doesn't have it
    mockVerifyResetToken.mockResolvedValue({ userId: 'user-1', email: 'user@example.com' });

    const res2 = await POST(buildRequest('valid-jwt-but-not-in-db'));
    const json2 = await res2.json();

    // Both should return the same error message
    expect(res1.status).toBe(400);
    expect(res2.status).toBe(400);
    expect(json1.error).toBe(json2.error);
    expect(json1.error).toMatch(/invalide ou a expiré/i);
  });

  it('rejects a token whose DB record has expired (TTL expiry)', async () => {
    const token = 'expired-db-token';
    const tokenHash = hashToken(token);

    mockVerifyResetToken.mockResolvedValue({ userId: 'user-1', email: 'user@example.com' });
    dbTokenStore.set(tokenHash, {
      id: 'token-1',
      tokenHash,
      usedAt: null,
      expiresAt: new Date(Date.now() - 60_000), // expired 1 min ago
    });

    const res = await POST(buildRequest(token));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalide ou a expiré/i);
  });

  it('rejects a token that has already been used (single-use enforcement)', async () => {
    const token = 'used-token';
    const tokenHash = hashToken(token);

    mockVerifyResetToken.mockResolvedValue({ userId: 'user-1', email: 'user@example.com' });
    dbTokenStore.set(tokenHash, {
      id: 'token-2',
      tokenHash,
      usedAt: new Date(Date.now() - 5_000), // used 5 seconds ago
      expiresAt: new Date(Date.now() + 60_000),
    });

    const res = await POST(buildRequest(token));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalide ou a expiré/i);
  });

  it('marks the token as used after a successful password reset', async () => {
    const token = 'valid-fresh-token';
    const tokenHash = hashToken(token);

    mockVerifyResetToken.mockResolvedValue({ userId: 'user-1', email: 'user@example.com' });
    dbTokenStore.set(tokenHash, {
      id: 'token-3',
      tokenHash,
      usedAt: null,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    const res = await POST(buildRequest(token));
    expect(res.status).toBe(200);

    const dbToken = dbTokenStore.get(tokenHash);
    expect(dbToken?.usedAt).not.toBeNull();
  });
});