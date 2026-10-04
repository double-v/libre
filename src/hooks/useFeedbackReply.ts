'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { FEEDBACK_READ_EVENT } from '@/lib/feedback-reply';

/**
 * useFeedbackReply — l'équipe a-t-elle répondu à un de mes retours ? (#477)
 *
 * Même rythme que `useAdminQueues` : au montage, à chaque navigation et au
 * retour au premier plan, sans temps réel — une réponse arrive en heures, pas
 * en secondes. « Mes retours » émet `FEEDBACK_READ_EVENT` après le marquage
 * lu, pour éteindre le point sans attendre la navigation suivante.
 *
 * `enabled=false` (visiteur) : aucun appel. Un booléen, jamais un nombre.
 */
export function useFeedbackReply({ enabled }: { enabled: boolean }): { hasReply: boolean } {
  const pathname = usePathname();
  const [hasReply, setHasReply] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = () => {
      fetch('/api/feedback/mine/unread', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!cancelled && d) setHasReply(d.hasUnreadReply === true);
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
    window.addEventListener(FEEDBACK_READ_EVENT, load);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(FEEDBACK_READ_EVENT, load);
    };
    // `pathname` est là pour déclencher un rechargement, pas pour être lu.
  }, [enabled, pathname]);

  return { hasReply: enabled && hasReply };
}
