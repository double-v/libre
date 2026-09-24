/**
 * Où en est la vérification d'un membre (#436) — lu par la page `/verify`,
 * par Paramètres et par les gardes des routes.
 *
 * `isVerified` fait foi pour « validée » : c'est ce que les autres membres
 * voient. Sinon, la dernière demande dit s'il faut attendre ou recommencer.
 */
import { getDb } from '@/lib/db';
import { MOTIFS_REFUS, type MotifRefus } from './motifs';

export type StatutVerification =
  | { statut: 'aucune' }
  | { statut: 'en_cours' }
  | { statut: 'validee' }
  | { statut: 'refusee'; motif: string | null };

export async function statutVerification(userId: string): Promise<StatutVerification> {
  const db = getDb();
  const [user, derniere] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { isVerified: true } }),
    db.verificationRequest.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { status: true, rejectReason: true },
    }),
  ]);
  if (user?.isVerified) return { statut: 'validee' };
  if (derniere?.status === 'pending') return { statut: 'en_cours' };
  if (derniere?.status === 'rejected') {
    const motif = derniere.rejectReason && derniere.rejectReason in MOTIFS_REFUS
      ? MOTIFS_REFUS[derniere.rejectReason as MotifRefus]
      : null;
    return { statut: 'refusee', motif };
  }
  return { statut: 'aucune' };
}

/** Une demande ne s'ouvre que si rien n'est en cours et le profil pas encore vérifié. */
export function peutDemander(s: StatutVerification): boolean {
  return s.statut === 'aucune' || s.statut === 'refusee';
}
