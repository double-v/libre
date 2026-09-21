'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Alert from '@/components/ui/Alert';

/**
 * RetentionAlert — sur le tableau de bord, seulement si la purge est en
 * retard (#427). Sans trafic, rien ne la déclenche ; c'est ici que ça se voit.
 */
export default function RetentionAlert() {
  const [enRetard, setEnRetard] = useState(false);

  useEffect(() => {
    let annule = false;
    fetch('/api/admin/retention')
      .then(async (r) => (r.ok ? ((await r.json()) as { enRetard: boolean }).enRetard : false))
      .catch(() => false)
      .then((v) => { if (!annule) setEnRetard(v); });
    return () => { annule = true; };
  }, []);

  if (!enRetard) return null;
  return (
    <div className="mb-6">
      <Alert variant="warning" title="Purge de rétention en retard">
        Aucun passage depuis plus de 48 h : les durées de conservation promises ne sont pas appliquées.{' '}
        <Link href="/admin/retention" className="font-semibold underline underline-offset-2 hover:no-underline">Voir et lancer</Link>
      </Alert>
    </div>
  );
}
