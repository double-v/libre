import { PrismaClient } from '@/generated/client/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis as unknown as {
  __libre_prisma: PrismaClient | undefined;
};

/**
 * Returns the singleton PrismaClient instance.
 * Uses a function accessor + globalThis because Turbopack wraps module
 * exports in a proxy that breaks PrismaClient's internal delegation chain.
 * Reading from globalThis at call-time always returns the live object.
 */
export function getDb(): PrismaClient {
  if (!globalForPrisma.__libre_prisma) {
    const connectionString = process.env.DATABASE_URL;
    // Neon requires explicit SSL config (Prisma 7 PrismaPg regression #29252)
    const isNeon = connectionString?.includes('neon.tech');
    const pool = new pg.Pool({
      connectionString,
      ssl: isNeon ? { rejectUnauthorized: false } : undefined,
    });
    const adapter = new PrismaPg(pool);
    globalForPrisma.__libre_prisma = new PrismaClient({ adapter });
  }
  return globalForPrisma.__libre_prisma;
}

// Legacy exports — still break under Turbopack but kept for type compat.
// Prefer getDb() everywhere in server code.
export const prisma = globalForPrisma.__libre_prisma ?? ({} as PrismaClient);
export default prisma;