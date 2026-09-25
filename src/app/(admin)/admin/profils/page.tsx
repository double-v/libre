'use client';

import { useState, useEffect, useCallback } from 'react';
import Button from '@/components/ui/Button';
import AdminProfilCard, { type DecisionProfil, type ProfilRow } from '@/components/AdminProfilCard';

/**
 * File « Profils à vérifier » (spec 006, US4). Les indices ne décident rien :
 * l'admin tranche, chaque décision est journalisée. Le rattrapage analyse les
 * profils écrits avant la détection, lot par lot, jusqu'au bout.
 */
export default function AdminProfilsPage() {
  const [profils, setProfils] = useState<ProfilRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState('');
  const [analyse, setAnalyse] = useState<{ enCours: boolean; profils: number; fini: boolean }>({ enCours: false, profils: 0, fini: false });

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/profils-a-verifier');
      if (!res.ok) throw new Error();
      setProfils((await res.json()).profils);
    } catch {
      setErreur('Impossible de charger la file.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => { await charger(); })();
  }, [charger]);

  const decider = async (userId: string, decision: DecisionProfil) => {
    setErreur('');
    try {
      const res = await fetch(`/api/admin/profils-a-verifier/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) throw new Error();
      await charger();
    } catch {
      setErreur('La décision n’a pas été enregistrée. Réessaie.');
    }
  };

  const rattraper = async () => {
    setAnalyse({ enCours: true, profils: 0, fini: false });
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
        setAnalyse({ enCours: true, profils: total, fini: false });
      } while (apres);
      setAnalyse({ enCours: false, profils: total, fini: true });
      await charger();
    } catch {
      setAnalyse({ enCours: false, profils: total, fini: false });
      setErreur('L’analyse s’est arrêtée en route. Relance-la : elle reprend sans rien refaire en double.');
    }
  };

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-content">Profils à vérifier</h1>
      <p className="mb-5 max-w-reading text-sm text-muted">
        Un profil arrive ici sur un indice fort, sur deux indices, ou quand quelqu’un le signale comme faux.
        Les indices ne décident rien : c’est toi qui tranches, et chaque décision est journalisée.
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-card border border-hairline bg-surface p-4">
        <Button type="button" size="sm" variant="secondary" loading={analyse.enCours} disabled={analyse.enCours} onClick={() => void rattraper()}>
          Analyser les profils existants
        </Button>
        <span className="text-sm text-muted" aria-live="polite">
          {analyse.enCours
            ? `Analyse en cours : ${analyse.profils} profils lus.`
            : analyse.fini
              ? `Analyse terminée : ${analyse.profils} profils lus.`
              : 'Lit le pseudo, la bio et les photos des profils créés avant la détection.'}
        </span>
      </div>

      {erreur && <div role="alert" className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{erreur}</div>}

      {loading ? (
        <p className="text-muted">Chargement…</p>
      ) : profils.length === 0 ? (
        <p className="text-muted">Aucun profil à vérifier pour le moment.</p>
      ) : (
        <div className="space-y-3">
          {profils.map((p) => (
            <AdminProfilCard key={p.userId} p={p} onDecision={(d) => decider(p.userId, d)} />
          ))}
        </div>
      )}
    </div>
  );
}
