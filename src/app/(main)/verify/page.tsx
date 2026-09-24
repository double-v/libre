'use client';

import { useRouter } from 'next/navigation';
import SiteShell from '@/components/ui/SiteShell';
import VerifyFlow from '@/components/verification/VerifyFlow';

/**
 * Badge vérifié par selfie (#436). Entrée depuis Paramètres › Vérification,
 * qui pointait jusque-là vers une page inexistante.
 */
export default function VerifyPage() {
  const router = useRouter();
  const retour = () => router.push('/settings');
  return (
    <SiteShell as="section" width="app" className="py-6 md:pt-11">
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={retour}
          className="-ml-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-2 text-sm text-muted hover:bg-fill-subtle focus-visible:outline-none focus-visible:shadow-focus"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Paramètres
        </button>
      </div>
      <VerifyFlow onRetour={retour} />
    </SiteShell>
  );
}
