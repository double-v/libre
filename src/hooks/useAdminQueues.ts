'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { hasPendingQueues, type AdminQueues } from '@/lib/admin-queues';

/**
 * useAdminQueues — « y a-t-il quelque chose à traiter ? » pour l'accès admin
 * de `SiteNav` (#391, spec 003 US3, R7).
 *
 * Recharge au montage, à chaque changement de route et au retour au premier
 * plan. Ni canal temps réel ni minuterie (Q3) : un signalement qui attend
 * quelques secondes de plus n'est pas le problème ; un admin qui ne le voit
 * jamais l'est, et il navigue.
 *
 * `enabled=false` (non-admin) : aucun appel, jamais — FR-013, rien de visible
 * ni de chargé pour un membre. Les compteurs sont gardés à zéro par défaut ;
 * l'app membre n'affiche qu'une présence, les nombres sont pour le layout admin.
 */
const EMPTY: AdminQueues = { reports: 0, verifications: 0, feedback: 0, profils: 0 };

export function useAdminQueues({ enabled }: { enabled: boolean }): { hasPending: boolean } {
  const pathname = usePathname();
  const [queues, setQueues] = useState<AdminQueues>(EMPTY);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = () => {
      fetch('/api/admin/queues', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (cancelled || !d) return;
          setQueues({ reports: d.reports ?? 0, verifications: d.verifications ?? 0, feedback: d.feedback ?? 0, profils: d.profils ?? 0 });
        })
        .catch(() => {
          // Réseau : on garde l'état précédent, la prochaine navigation corrigera.
        });
    };
    load();
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
    // `pathname` est là pour déclencher un rechargement, pas pour être lu.
  }, [enabled, pathname]);

  return { hasPending: enabled && hasPendingQueues(queues) };
}
