'use client';

import { useSession } from 'next-auth/react';
import SquareChat from '@/components/SquareChat';
import SiteShell from '@/components/ui/SiteShell';

export default function SquarePage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="flex min-h-[60vh] items-center justify-center text-muted">Chargement…</div>;
  }

  if (!session?.user?.id) {
    return (
      <SiteShell className="py-12 text-center">
        <p className="text-muted">Connecte-toi pour accéder à la Place.</p>
      </SiteShell>
    );
  }

  return (
    <SiteShell className="py-6 md:pb-section md:pt-11">
      <SquareChat userId={session.user.id} />
    </SiteShell>
  );
}
