import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '../../src/generated/client/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

describe('Database connection', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('connects to the database', async () => {
    await expect(prisma.$queryRaw`SELECT 1`).resolves.toBeDefined();
  });
});