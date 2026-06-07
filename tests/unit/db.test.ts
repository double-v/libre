import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '../../src/generated/client/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

describe('Database connection', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    const connectionString = process.env.DATABASE_URL;
    const isNeon = connectionString?.includes('neon.tech');
    const pool = new pg.Pool({
      connectionString,
      ssl: isNeon ? { rejectUnauthorized: false } : undefined,
    });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('connects to the database', async () => {
    // GitHub Actions postgres service can take a few seconds to accept
    // connections after the healthcheck. Retry up to 5 times with a short
    // backoff to absorb the race. Timeout extended to 10s to fit the
    // backoff (5 * 500ms = 2.5s of waits + connect time per attempt).
    let lastError: unknown;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        await expect(prisma.$queryRaw`SELECT 1`).resolves.toBeDefined();
        return;
      } catch (err) {
        lastError = err;
        await new Promise((r) => setTimeout(r, attempt * 500));
      }
    }
    throw lastError;
  }, 15_000);
});