'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';
import { lireStatut, type StatutVerification } from '@/lib/verification/client';

/**
 * Paramètres › Vérification (#436) — quatre états, lus sur la même route que
 * la page `/verify`. Tant que le statut n'est pas connu, on n'affiche pas de
 * bouton : proposer « Obtenir le badge » à un profil vérifié serait faux.
 */
export default function VerificationSettings({ charger = lireStatut }: { charger?: typeof lireStatut }) {
  const router = useRouter();
  const [statut, setStatut] = useState<StatutVerification | null>(null);

  useEffect(() => {
    let actif = true;
    void charger().then((r) => { if (actif && r.ok) setStatut(r.valeur); });
    return () => { actif = false; };
  }, [charger]);

  const vers = () => router.push('/verify');

  return (
    <section className="rounded-xl border border-hairline bg-surface p-4 sm:p-5">
      <h2 className="flex items-center justify-between gap-2 text-lg font-semibold text-content">
        Vérification
        {statut?.statut === 'en_cours' && <Tag variant="pending" size="sm">En cours</Tag>}
        {statut?.statut === 'refusee' && <Tag variant="refused" size="sm">Non validé</Tag>}
      </h2>
      {statut?.statut === 'validee' && (
        <p className="mt-2 flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-success" aria-hidden="true">
            <circle cx="12" cy="12" r="10" fill="currentColor" />
            <path d="M7.5 12.3l3 3 6-6.3" fill="none" className="stroke-white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Ton profil est vérifié
        </p>
      )}
      {statut?.statut === 'aucune' && (
        <div className="mt-2 space-y-3">
          <p className="text-sm text-muted">Le badge vérifié montre aux autres que tes photos sont bien les tiennes.</p>
          <Button type="button" size="sm" onClick={vers}>Obtenir le badge</Button>
        </div>
      )}
      {statut?.statut === 'en_cours' && (
        <p className="mt-2 text-sm text-muted">Une personne de l&apos;équipe examine ton selfie.</p>
      )}
      {statut?.statut === 'refusee' && (
        <div className="mt-2 space-y-3">
          <p className="text-sm text-muted">{statut.motif ?? 'Ton selfie n’a pas pu être validé.'}</p>
          <Button type="button" size="sm" variant="secondary" onClick={vers}>Recommencer</Button>
        </div>
      )}
    </section>
  );
}
