'use client';

import Link from 'next/link';
import SiteShell from '@/components/ui/SiteShell';
import { buttonClassName } from '@/components/ui/Button';
import { COPY_EN_PAUSE } from '@/lib/features';

/**
 * Page d'atterrissage d'une fonctionnalité coupée (#418). Le proxy y renvoie
 * `/square` et `/crossings` quand leur interrupteur est baissé. Une seule
 * copie, douce, sans nommer d'admin ni de raison : ce n'est pas au membre de
 * porter nos chantiers.
 */
export default function EnPausePage() {
  return (
    <SiteShell width="app">
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-xl font-bold text-content">En pause</h1>
        <p className="text-sm text-muted">{COPY_EN_PAUSE}</p>
        <Link href="/discover" className={buttonClassName('primary')}>
          Retour à Découvrir
        </Link>
      </div>
    </SiteShell>
  );
}
