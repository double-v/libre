/**
 * Jeu de données factice des tests d'intégration (#548).
 *
 * Appelé par le `globalSetup` de Vitest (tests/integration/global-setup.ts),
 * jamais par `npx tsx` : ce paquet n'est pas une dépendance du dépôt, et `npx`
 * le téléchargerait à la volée, sans version figée.
 *
 * Ne s'exécute que sur une base jetable (même garde que les tests) : jamais
 * Neon, jamais la production. Idempotent. Aucune donnée réelle : domaine
 * réservé `.test`.
 */
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/client/client';
import { baseEstJetable, URL_NEUTRALISEE } from '../tests/garde-base';
import { MEMBRES_FACTICES } from './membres-factices';
import { normalizeEmail } from '../src/lib/email';

export async function semerBaseDeTest(url: string | undefined): Promise<number> {
  if (!baseEstJetable(url) || url === URL_NEUTRALISEE) {
    throw new Error('[seed-test] Refusé : DATABASE_URL ne vise pas une base locale jetable (#548).');
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg(new pg.Pool({ connectionString: url })) });
  try {
    for (const m of MEMBRES_FACTICES) {
      await prisma.user.upsert({
        where: { email: m.email },
        update: { displayName: m.displayName, role: m.role, isBanned: m.isBanned },
        create: { ...m, normalizedEmail: normalizeEmail(m.email) },
      });
    }
    return MEMBRES_FACTICES.length;
  } finally {
    await prisma.$disconnect();
  }
}
