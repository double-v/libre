import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '../../src/generated/client/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

/**
 * Connect to Postgres with a small bounded retry loop.
 *
 * Why: the GH Actions service container can accept TCP but reject the first
 * SCRAM auth attempt with "password authentication failed" (28P01) right
 * after the pg_isready healthcheck flips to healthy. We see this in
 * production CI logs (issue #35) and the test was marked flaky. Retrying
 * once or twice on the specific Prisma auth error is enough to cross that
 * warm-up window without hiding real failures (we still fail the run on
 * anything else, and we still fail on a non-auth error after retries).
 */
async function connectWithRetry(): Promise<PrismaClient> {
  const connectionString = process.env.DATABASE_URL;
  const isNeon = connectionString?.includes('neon.tech');
  // NOTE: rejectUnauthorized:false is intentional and limited to Neon
  // (detected via host containing 'neon.tech'). Neon uses a cert chain
  // that some Node builds don't trust by default; this matches the
  // pattern used elsewhere in the app for the production DB connection.
  // Local / CI Postgres is unaffected (isNeon === false).
  const pool = new pg.Pool({
    connectionString,
    ssl: isNeon ? { rejectUnauthorized: false } : undefined,
  });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });

  const maxAttempts = 3;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await client.$queryRaw`SELECT 1`;
      return client;
    } catch (err) {
      lastError = err;
      const isAuthError =
        err instanceof Error &&
        (err.message.includes('AuthenticationFailed') ||
          err.message.includes('password authentication failed'));
      if (!isAuthError || attempt === maxAttempts) {
        await client.$disconnect().catch(() => {});
        throw err;
      }
      // small exponential backoff: 250ms, 500ms
      await new Promise((r) => setTimeout(r, 250 * attempt));
    }
  }
  // Should be unreachable, but TypeScript wants a return.
  throw lastError;
}

describe('Database connection', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = await connectWithRetry();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('connects to the database', async () => {
    await expect(prisma.$queryRaw`SELECT 1`).resolves.toBeDefined();
  });

  it('connectWithRetry succeeds against a reachable DB', async () => {
    // Smoke test for the helper itself: with DATABASE_URL pointing at the
    // local dev/test Postgres, it should resolve on the first attempt and
    // return a working PrismaClient.
    const client = await connectWithRetry();
    try {
      const result = await client.$queryRaw`SELECT 1 as ok`;
      expect(Array.isArray(result)).toBe(true);
    } finally {
      await client.$disconnect();
    }
  });
});
