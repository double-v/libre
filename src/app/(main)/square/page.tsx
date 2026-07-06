'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import SquareChat from '@/components/SquareChat';

export default function SquarePage() {
  const { data: session, status } = useSession();
  // null = pas encore vérifié ; true/false = flag admin résolu.
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/square/availability')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active) setEnabled(d ? d.enabled !== false : true);
      })
      .catch(() => {
        if (active) setEnabled(true); // dégradation gracieuse
      });
    return () => {
      active = false;
    };
  }, []);

  if (status === 'loading') {
    return <div className="flex min-h-[60vh] items-center justify-center text-gray-500">Chargement…</div>;
  }

  if (!session?.user?.id) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-gray-500">Connecte-toi pour accéder à la Place.</p>
      </div>
    );
  }

  if (enabled === false) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-gray-700 dark:text-gray-300">La Place est en pause pour le moment.</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Reviens bientôt, elle rouvrira.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <SquareChat userId={session.user.id} />
    </div>
  );
}
