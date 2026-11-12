// @vitest-environment node
/**
 * Base de test jetable (#548) : on vérifie qu'on est bien sur elle, qu'elle
 * porte toutes les migrations du dépôt et le jeu factice, et rien d'autre.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readdirSync } from 'fs';
import path from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/client/client';
import { baseEstJetable } from '../garde-base';
import { MEMBRES_FACTICES } from '../../prisma/membres-factices';

describe('base de test jetable', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('vise une base locale réservée aux tests : ni Neon, ni l’adresse neutralisée par la garde', () => {
    expect(baseEstJetable(process.env.DATABASE_URL)).toBe(true);
  });

  it('porte toutes les migrations du dépôt, appliquées sans échec', async () => {
    const dossiers = readdirSync(path.resolve(__dirname, '../../prisma/migrations'), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    const appliquees = await prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name FROM _prisma_migrations
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
      ORDER BY migration_name`;
    expect(appliquees.map((m) => m.migration_name)).toEqual(dossiers);
  });

  it('contient le jeu factice, et seulement lui', async () => {
    const emails = await prisma.user.findMany({ select: { email: true }, orderBy: { email: 'asc' } });
    expect(emails.map((u) => u.email)).toEqual(MEMBRES_FACTICES.map((m) => m.email).sort());
  });
});
