/**
 * Où en est la vérification d'un membre (#436, spec 012) — lu par la page
 * `/verify`, par Paramètres, par le repère de la roue dentée et par les
 * gardes des routes.
 *
 * `isVerified` fait foi pour « validée » : c'est ce que les autres membres
 * voient. Sinon, la dernière demande dit s'il faut attendre ou recommencer.
 * Rien ici ne vient de la lecture automatique du code (FR-S05).
 */
import { getDb } from '@/lib/db';
import { droitTirage } from './code';
import { lireMotif } from './motifs';

export interface MotifLu {
  cle: string;
  texte: string;
  conseil: string;
}

export type StatutVerification =
  | { statut: 'aucune' }
  | { statut: 'en_cours' }
  | { statut: 'validee' }
  | {
      statut: 'refusee';
      motif: MotifLu | null;
      /** Rang de la prochaine demande depuis la dernière validation. */
      tentative: number;
      /** Présent seulement après trois refus consécutifs (FR-012). */
      reessaiAt?: string;
      /** Le membre n'a pas encore vu ce refus (repère de présence, FR-010). */
      nonVu: boolean;
    };

export async function statutVerification(userId: string, maintenant: Date = new Date()): Promise<StatutVerification> {
  const db = getDb();
  const [user, demandes] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { isVerified: true } }),
    db.verificationRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { status: true, rejectReason: true, resolvedAt: true, vueAt: true },
      take: 50,
    }),
  ]);
  if (user?.isVerified) return { statut: 'validee' };
  const derniere = demandes[0];
  if (derniere?.status === 'pending') return { statut: 'en_cours' };
  if (derniere?.status === 'rejected') {
    const m = lireMotif(derniere.rejectReason);
    const droit = droitTirage(demandes, maintenant);
    return {
      statut: 'refusee',
      motif: m ? { cle: m.cle, texte: m.texte, conseil: m.conseil } : null,
      tentative: droit.tentative,
      ...(droit.ok ? {} : { reessaiAt: droit.reessaiAt.toISOString() }),
      nonVu: derniere.vueAt === null,
    };
  }
  return { statut: 'aucune' };
}

/** Une demande ne s'ouvre que si rien n'est en cours et le profil pas encore vérifié. */
export function peutDemander(s: StatutVerification): boolean {
  return s.statut === 'aucune' || s.statut === 'refusee';
}
