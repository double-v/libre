/**
 * Files de travail admin (#391, spec 003 US3 / R7 ; spec 012, T030).
 *
 * Les cas en attente viennent des compteurs du hub Membres (`compterCas`, un
 * seul `COUNT` groupé sur les mêmes cas que la liste) : la pastille de
 * `SiteNav`, la navigation admin et les puces du hub ne peuvent plus
 * diverger. Les retours restent comptés à part, sur leur statut.
 *
 * Le module est pur — la base et le comptage des cas sont injectés — parce
 * que `useAdminQueues` (client) en importe le type et `hasPendingQueues` : un
 * `import '@/lib/db'` ici tirerait Prisma dans le bundle navigateur.
 */
import type { Compteurs } from '@/lib/moderation/cas';

export interface AdminQueues {
  /** Tous les cas en attente du hub Membres (filtre « À traiter »). */
  atraiter: number;
  reports: number;
  verifications: number;
  feedback: number;
  /** Indices et photos à revoir (anciennes files « Indices » et « Profils à vérifier »). */
  profils: number;
}

/** Le strict nécessaire du client Prisma : les retours ouverts. */
export interface QueueCounter {
  feedback: { count(args: { where: { status: string } }): Promise<number> };
}

const AUCUN_CAS: Compteurs = { atraiter: 0, verif: 0, report: 0, photo: 0, reponse: 0, indice: 0 };

/**
 * Un comptage qui échoue vaut 0 pour SA source seulement : si les cas ne se
 * comptent pas, les retours restent justes, et inversement. L'admin voit
 * encore quelque chose précisément quand quelque chose cloche.
 */
export async function countAdminQueues(db: QueueCounter, compterCas: () => Promise<Compteurs>): Promise<AdminQueues> {
  const [cas, retours] = await Promise.allSettled([compterCas(), db.feedback.count({ where: { status: 'open' } })]);
  if (cas.status === 'rejected') console.error('[admin-queues] comptage des cas échoué :', cas.reason instanceof Error ? cas.reason.message.slice(0, 80) : 'inconnu');
  if (retours.status === 'rejected') console.error('[admin-queues] comptage des retours échoué :', retours.reason instanceof Error ? retours.reason.message.slice(0, 80) : 'inconnu');
  const c = cas.status === 'fulfilled' ? cas.value : AUCUN_CAS;
  return {
    atraiter: c.atraiter,
    reports: c.report,
    verifications: c.verif,
    profils: c.indice + c.photo + c.reponse,
    feedback: retours.status === 'fulfilled' ? retours.value : 0,
  };
}

/** Une pastille, pas un total : depuis l'app membre, l'admin veut savoir s'il y a quelque chose, pas combien. */
export function hasPendingQueues(q: Partial<AdminQueues>): boolean {
  return (q.atraiter ?? 0) > 0 || (q.reports ?? 0) > 0 || (q.verifications ?? 0) > 0 || (q.feedback ?? 0) > 0 || (q.profils ?? 0) > 0;
}
