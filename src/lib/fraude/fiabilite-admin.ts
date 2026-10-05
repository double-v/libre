import { getDb } from '@/lib/db';
import { fiabiliteParCompte, type FiabiliteCompte } from './fiabilite';

/**
 * Charge le niveau de fiabilité de chaque compte signalé (spec 010, US3).
 * Surfaces admin seulement : aucune route membre ne doit l'importer (garde
 * `signaux-never-leak`).
 */
export async function chargerFiabilite(): Promise<Map<string, FiabiliteCompte>> {
  const db = getDb();
  const signaux = await db.profileSignal.findMany({ select: { userId: true, type: true, force: true, createdAt: true } });
  if (signaux.length === 0) return new Map();
  const ids = [...new Set(signaux.map((s) => s.userId))];
  const [decisions, verifies] = await Promise.all([
    db.profileReview.findMany({ where: { userId: { in: ids } }, select: { userId: true, decidedAt: true } }),
    db.user.findMany({ where: { id: { in: ids }, isVerified: true }, select: { id: true } }),
  ]);
  return fiabiliteParCompte(
    signaux,
    new Map(decisions.map((d) => [d.userId, d.decidedAt])),
    new Set(verifies.map((v) => v.id)),
  );
}
