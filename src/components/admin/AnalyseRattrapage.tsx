'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';

/**
 * Rattrapage de la détection sur les profils anciens (spec 006, FR-011),
 * repris de l'ancienne page Indices : le hub Membres le propose sous le
 * filtre « Indices ». Par lots de dix, reprenable : rejouer ne refait rien en
 * double.
 */
export default function AnalyseRattrapage({ onFini }: { onFini: () => void }) {
  const [etat, setEtat] = useState({ enCours: false, profils: 0, fini: false, erreur: false });

  async function rattraper() {
    setEtat({ enCours: true, profils: 0, fini: false, erreur: false });
    let apres: string | null = null;
    let total = 0;
    try {
      do {
        const res: Response = await fetch('/api/admin/profils-a-verifier/analyse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apres ? { apres } : {}),
        });
        if (!res.ok) throw new Error();
        const lot: { profils: number; suivant: string | null } = await res.json();
        total += lot.profils;
        apres = lot.suivant;
        setEtat({ enCours: true, profils: total, fini: false, erreur: false });
      } while (apres);
      setEtat({ enCours: false, profils: total, fini: true, erreur: false });
      onFini();
    } catch {
      setEtat({ enCours: false, profils: total, fini: false, erreur: true });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card border border-hairline bg-surface p-3.5">
      <Button pill size="sm" variant="secondary" loading={etat.enCours} disabled={etat.enCours} onClick={() => void rattraper()}>
        Analyser les profils existants
      </Button>
      <span className="text-sm text-muted" aria-live="polite">
        {etat.erreur
          ? 'L’analyse s’est arrêtée en route. Relance-la : elle reprend sans rien refaire en double.'
          : etat.enCours
            ? `Analyse en cours : ${etat.profils} profils lus.`
            : etat.fini
              ? `Analyse terminée : ${etat.profils} profils lus.`
              : 'Lit le pseudo, la bio et les photos des profils créés avant la détection.'}
      </span>
    </div>
  );
}
