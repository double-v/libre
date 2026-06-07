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
    // Note: this test is flaky on CI — see the issue tracking Playwright
    // re-enable (#35) for context. The auth race here is similar: the
    // service postgres can reject the first auth attempt with
    // 'password authentication failed' even after passing the GitHub
    // healthcheck. Kept as a smoke test; vitest's default 5s timeout
    // is the right cutoff for a healthy run.
    await expect(prisma.$queryRaw`SELECT 1`).resolves.toBeDefined();
  });
});