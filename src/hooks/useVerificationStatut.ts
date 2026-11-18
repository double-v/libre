'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { VERIFICATION_VUE_EVENT } from '@/lib/verification/client';

/**
 * useVerificationStatut — un refus de selfie attend-il d'être vu ? (spec 012, FR-010)
 *
 * Même rythme que `useFeedbackReply` : au montage, à chaque navigation et au
 * retour au premier plan, sans temps réel. La page `/verify` émet
 * `VERIFICATION_VUE_EVENT` après le marquage, pour éteindre le repère sans
 * attendre la navigation suivante. Un booléen, jamais un nombre.
 */
export function useVerificationStatut({ enabled }: { enabled: boolean }): { refusNonVu: boolean } {
  const pathname = usePathname();
  const [refusNonVu, setRefusNonVu] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = () => {
      fetch('/api/moderation/verify', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!cancelled && d) setRefusNonVu(d.statut === 'refusee' && d.nonVu === true);
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
    window.addEventListener(VERIFICATION_VUE_EVENT, load);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(VERIFICATION_VUE_EVENT, load);
    };
    // `pathname` est là pour déclencher un rechargement, pas pour être lu.
  }, [enabled, pathname]);

  return { refusNonVu: enabled && refusNonVu };
}
