'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from '@/lib/toast';

/**
 * ConsentSensibleSettings — « Données sensibles » (#425, art. 7.3 et 9).
 *
 * Le retrait du consentement efface l'orientation, l'identité de genre, les
 * pratiques et les personnes cherchées, d'un seul tenant côté serveur. Pas de
 * switch ici : un switch se bascule par réflexe, un effacement se décide — deux
 * temps sur place, comme la zone dangereuse. Redonner le consentement ne se
 * fait pas d'ici mais à la prochaine saisie dans le profil : consentir sans
 * rien saisir n'aurait pas d'objet.
 */
const COPY = {
  actif: 'Tu as accepté que Libre enregistre ton orientation, ton identité de genre, tes pratiques et les personnes que tu cherches.',
  inactif: 'Tu n’as pas encore donné ce consentement. Il te sera proposé à la première saisie de ces informations dans ton profil.',
  confirmation: 'Ton orientation, ton identité de genre, tes pratiques et les personnes que tu cherches seront effacés. Ton compte reste ; tu pourras les ressaisir plus tard.',
  fait: 'Consentement retiré, informations effacées.',
  erreur: 'Impossible de retirer le consentement pour le moment.',
};

export default function ConsentSensibleSettings() {
  const [actif, setActif] = useState<boolean | null>(null);
  const [confirme, setConfirme] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/users/consent')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { sensitiveData: boolean }) => { if (!cancelled) setActif(Boolean(d.sensitiveData)); })
      .catch(() => { if (!cancelled) setActif(false); });
    return () => { cancelled = true; };
  }, []);

  async function retirer() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/users/consent', { method: 'DELETE' });
      if (!res.ok) throw new Error(String(res.status));
      setActif(false);
      setConfirme(false);
      toast(COPY.fait);
    } catch {
      setError(COPY.erreur);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="donnees-sensibles" className="rounded-xl border border-hairline bg-surface p-4 sm:p-5">
      <h2 className="text-lg font-semibold text-content">Données sensibles</h2>
      <p className="mt-1 text-sm text-muted" aria-live="polite">
        {actif === null ? '' : actif ? COPY.actif : COPY.inactif}{' '}
        <Link href="/confidentialite" className="text-coral hover:underline">En savoir plus</Link>
      </p>
      {actif && !confirme && (
        <button
          type="button"
          onClick={() => setConfirme(true)}
          className="mt-3 rounded-md border border-hairline-strong bg-surface px-4 py-2 text-sm font-medium text-muted hover:bg-fill-subtle focus:outline-none focus:ring-2 focus:ring-coral"
        >
          Retirer mon consentement
        </button>
      )}
      {actif && confirme && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-content">{COPY.confirmation}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void retirer()}
              disabled={busy}
              className="rounded-md bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-terracotta focus:outline-none focus:ring-2 focus:ring-coral disabled:opacity-50"
            >
              {busy ? 'Effacement…' : 'Confirmer l’effacement'}
            </button>
            <button
              type="button"
              onClick={() => setConfirme(false)}
              disabled={busy}
              className="rounded-md border border-hairline-strong bg-surface px-4 py-2 text-sm font-medium text-muted hover:bg-fill-subtle focus:outline-none focus:ring-2 focus:ring-coral"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-error">{error}</p>}
    </section>
  );
}
