'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAnnonce } from '@/components/AnnonceFile';

/**
 * RetraitNotice — le membre mis en retrait (spec 006, décision « Demander une
 * vérification ») l'apprend ici, et apprend surtout comment en sortir.
 *
 * Aucune mention de soupçon ni de signalement : un vrai membre peut être
 * mis en retrait par erreur, et l'humilier ferait fuir la personne qu'on
 * voulait protéger. Même DA que le bandeau de l'avenant. Il ne se ferme pas :
 * c'est un état, pas une annonce.
 *
 * Spec 010 : seconde variante, l'**invitation** automatique. Le profil reste
 * visible et la personne peut écrire ; le bandeau le dit, et se laisse écarter
 * 24 heures sur cet appareil. Il revient ensuite : c'est le rappel. Jamais de
 * motif ni de chiffre — un indice n'est pas une preuve.
 */
export const COPY_RETRAIT = {
  texte: 'Ton profil est masqué le temps d’une vérification. Fais un selfie en reproduisant un geste simple : ton profil réapparaît dès qu’il est validé.',
  action: 'Me faire vérifier',
};

export const COPY_INVITATION = {
  texte: 'Fais vérifier ton profil : un selfie en reproduisant un geste simple suffit. Le badge rassure les personnes que tu croises.',
  action: 'Me faire vérifier',
  plusTard: 'Plus tard',
};

export const CLE_INVITATION_ECARTEE = 'libre:invitation-ecartee';
const DUREE_ECART_MS = 24 * 60 * 60 * 1000;

function ecarteeRecemment(): boolean {
  try {
    const t = Number(localStorage.getItem(CLE_INVITATION_ECARTEE));
    return Number.isFinite(t) && t > 0 && Date.now() - t < DUREE_ECART_MS;
  } catch {
    return false;
  }
}

type Etat = 'rien' | 'retrait' | 'invitation';

export default function RetraitNotice() {
  const [etat, setEtat] = useState<Etat>('rien');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/users/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { retrait?: boolean; invitationVerification?: boolean } | null) => {
        if (cancelled || !d) return;
        // Le retrait l'emporte : il dit déjà « fais le selfie », et plus fort.
        if (d.retrait) setEtat('retrait');
        else if (d.invitationVerification && !ecarteeRecemment()) setEtat('invitation');
      })
      .catch(() => { /* sans réponse, pas de bandeau */ });
    return () => { cancelled = true; };
  }, []);

  // File d'annonces (#507) : l'avenant passe devant ; ce bandeau attend.
  const { visible } = useAnnonce('verification', etat !== 'rien');
  if (etat === 'rien' || !visible) return null;

  const copie = etat === 'retrait' ? COPY_RETRAIT : COPY_INVITATION;

  function plusTard() {
    try {
      localStorage.setItem(CLE_INVITATION_ECARTEE, String(Date.now()));
    } catch { /* stockage refusé : le bandeau se ferme quand même */ }
    setEtat('rien');
  }

  return (
    <div role="region" aria-label="Vérification de ton profil" className="border-b border-coral/20 bg-sunken px-4 py-2 text-xs text-coral-dark dark:border-coral/30 dark:text-coral-light">
      <div className="mx-auto flex max-w-content flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-center">
        <span>{copie.texte}</span>
        <Link
          href="/verify"
          className="inline-flex min-h-11 items-center rounded-full bg-coral px-3 text-xs font-semibold text-white hover:bg-terracotta focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
        >
          {copie.action}
        </Link>
        {etat === 'invitation' && (
          <button
            type="button"
            onClick={plusTard}
            className="inline-flex min-h-11 items-center rounded-full px-3 text-xs font-semibold text-coral-dark underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-coral dark:text-coral-light"
          >
            {COPY_INVITATION.plusTard}
          </button>
        )}
      </div>
    </div>
  );
}
