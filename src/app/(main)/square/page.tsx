'use client';

import { useSession } from 'next-auth/react';
import SquareChat from '@/components/SquareChat';

export default function SquarePage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="flex min-h-[60vh] items-center justify-center text-muted">Chargement…</div>;
  }

  if (!session?.user?.id) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-muted">Connecte-toi pour accéder à la Place.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <SquareChat userId={session.user.id} />
    </div>
  );
}
