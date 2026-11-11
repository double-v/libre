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
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/client/client';
import { baseEstJetable } from '../tests/garde-base';
import { MEMBRES_FACTICES } from './membres-factices';
import { normalizeEmail } from '../src/lib/email';

export async function semerBaseDeTest(url: string | undefined): Promise<number> {
  if (!url || !baseEstJetable(url)) {
    throw new Error('[seed-test] Refusé : DATABASE_URL ne vise pas une base locale jetable (#548).');
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  // L'adaptateur possède son pool et le ferme à la déconnexion ; un `pg.Pool`
  // passé de l'extérieur resterait ouvert et retiendrait le processus.
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
