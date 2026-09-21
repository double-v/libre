'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from '@/lib/toast';

/**
 * ConsentAvenantBanner — avenant art. 9 pour les retardataires (#425).
 *
 * Les comptes inscrits avant la case portent déjà orientation, genre ou
 * pratiques sans consentement explicite. Ce bandeau leur propose le choix
 * qu'ils n'ont pas eu : accepter, ou faire effacer ces informations. Même
 * emplacement et même DA que le bandeau bêta. Il se ferme pour la session
 * seulement (`sessionStorage`) : tant que rien n'est tranché, les données
 * restent traitées, donc la question revient.
 */
export const AVENANT_SESSION_KEY = 'libre:avenant-art9-ferme';

const COPY = {
  titre: 'Avenant',
  texte: 'Ton orientation, ton identité de genre et tes pratiques ne sont désormais conservées qu’avec ton accord explicite.',
  confirmation: 'Ces informations seront effacées de ton profil. Ton compte reste.',
  fait: 'Merci, c’est enregistré.',
  efface: 'Informations effacées.',
  erreur: 'Impossible pour le moment, réessaie plus tard.',
};

export default function ConsentAvenantBanner() {
  const [aRegulariser, setARegulariser] = useState(false);
  const [confirme, setConfirme] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let ferme = false;
    try { ferme = sessionStorage.getItem(AVENANT_SESSION_KEY) === '1'; } catch { /* stockage indisponible : on demande */ }
    fetch('/api/users/consent')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { aRegulariser?: boolean }) => {
        // Lecture post-hydratation, un seul flip (pattern SSR-safe, cf. BetaBanner).
        if (!cancelled && !ferme && d.aRegulariser) setARegulariser(true);
      })
      .catch(() => { /* sans réponse, pas de bandeau : on ne bloque rien */ });
    return () => { cancelled = true; };
  }, []);

  async function envoyer(method: 'POST' | 'DELETE') {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/users/consent', { method });
      if (!res.ok) throw new Error(String(res.status));
      setARegulariser(false);
      toast(method === 'POST' ? COPY.fait : COPY.efface);
    } catch {
      setError(COPY.erreur);
    } finally {
      setBusy(false);
    }
  }

  function fermer() {
    try { sessionStorage.setItem(AVENANT_SESSION_KEY, '1'); } catch { /* idem */ }
    setARegulariser(false);
  }

  if (!aRegulariser) return null;

  // Cibles tactiles ≥ 44 px (charte) : ce sont des décisions, pas des liens.
  const bouton = 'inline-flex min-h-11 items-center rounded-full px-3 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-coral disabled:opacity-50';

  return (
    <div role="region" aria-label="Avenant à la politique de confidentialité" className="border-b border-coral/20 bg-sunken px-4 py-2 text-xs text-coral-dark dark:border-coral/30 dark:text-coral-light">
      <div className="mx-auto flex max-w-content flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-center">
        <span className="rounded-full bg-coral px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider text-white">{COPY.titre}</span>
        <span>
          {confirme ? COPY.confirmation : COPY.texte}{' '}
          <Link href="/confidentialite" className="font-semibold underline underline-offset-2 hover:no-underline">En savoir plus</Link>
        </span>
        {confirme ? (
          <>
            <button type="button" disabled={busy} onClick={() => void envoyer('DELETE')} className={`${bouton} bg-coral text-white hover:bg-terracotta`}>
              {busy ? 'Effacement…' : 'Confirmer l’effacement'}
            </button>
            <button type="button" disabled={busy} onClick={() => setConfirme(false)} className={`${bouton} border border-coral/40 hover:bg-coral/10`}>
              Annuler
            </button>
          </>
        ) : (
          <>
            <button type="button" disabled={busy} onClick={() => void envoyer('POST')} className={`${bouton} bg-coral text-white hover:bg-terracotta`}>
              {busy ? 'Un instant…' : 'J’accepte'}
            </button>
            <button type="button" disabled={busy} onClick={() => setConfirme(true)} className={`${bouton} border border-coral/40 hover:bg-coral/10`}>
              Non, effacer ces informations
            </button>
          </>
        )}
        <button
          type="button"
          onClick={fermer}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-coral-dark/60 hover:text-coral-dark dark:text-coral-light/60 dark:hover:text-coral-light"
          aria-label="Fermer l’avenant pour cette session"
        >
          &times;
        </button>
        {error && <span role="alert" className="basis-full text-error">{error}</span>}
      </div>
    </div>
  );
}
