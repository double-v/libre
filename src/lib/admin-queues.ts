/**
 * Files de travail admin (#391, spec 003 US3 / R7).
 *
 * Trois `count` sur `status`, mêmes filtres que `/api/admin/stats` — la source
 * de vérité reste ces trois statuts (data-model.md). Partagé entre la route
 * `GET /api/admin/queues` (pastille de `SiteNav`) et le layout admin, qui est
 * un Server Component et ne repasse pas par HTTP pour ses propres données.
 *
 * Le module est pur — la base est injectée — parce que `useAdminQueues`
 * (client) en importe le type et `hasPendingQueues` : un `import '@/lib/db'`
 * ici tirerait Prisma dans le bundle navigateur.
 */
export interface AdminQueues {
  reports: number;
  verifications: number;
  feedback: number;
  /** Profils à vérifier (spec 006) : la règle de la file, pas un statut. */
  profils: number;
}

/** Le strict nécessaire du client Prisma : trois tables, un `count` chacune. */
export interface QueueCounter {
  report: { count(args: { where: { status: string } }): Promise<number> };
  verificationRequest: { count(args: { where: { status: string } }): Promise<number> };
  feedback: { count(args: { where: { status: string } }): Promise<number> };
}

/**
 * Un comptage qui échoue vaut 0 pour SA file seulement : les deux autres
 * restent justes. Avec `Promise.all`, un seul échec effaçait les trois — et
 * l'admin ne voyait plus rien précisément quand quelque chose cloche.
 */
export async function countAdminQueues(
  db: QueueCounter,
  // Injecté pour garder ce module pur : la file des profils lit Prisma.
  compterProfils: () => Promise<number> = async () => 0,
): Promise<AdminQueues> {
  const settled = await Promise.allSettled([
    db.report.count({ where: { status: 'pending' } }),
    db.verificationRequest.count({ where: { status: 'pending' } }),
    db.feedback.count({ where: { status: 'open' } }),
    compterProfils(),
  ]);
  const [reports, verifications, feedback, profils] = settled.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    console.error(`[admin-queues] comptage ${['reports', 'verifications', 'feedback', 'profils'][i]} échoué :`, r.reason);
    return 0;
  });
  return { reports, verifications, feedback, profils };
}

/** Une pastille, pas un total : depuis l'app membre, l'admin veut savoir s'il y a quelque chose, pas combien. */
export function hasPendingQueues(q: AdminQueues): boolean {
  return q.reports > 0 || q.verifications > 0 || q.feedback > 0 || (q.profils ?? 0) > 0;
}
