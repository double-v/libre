'use client';

import { useState } from 'react';
import TagButton from './TagButton';
import Button from './ui/Button';
import ConsentSensibleField, { COPY_CONSENT_SENSIBLE } from './ConsentSensibleField';
import { GENDER_OPTIONS, ORIENTATION_OPTIONS } from '@/lib/taxonomy';
import { MIRROR_COPY } from '@/lib/onboarding';

/**
 * La question à deux portes (réciprocité genre/orientation, #519) — vue
 * partagée par `SearchFilters` (panneau de filtres) et `StepSeeking` (étape 2
 * du parcours). Un seul patron porte donc la copie, les champs, la case art. 9
 * et l'ordre des portes : toute retouche se fait ici, pas quatre fois.
 *
 * Une seule question à l'écran : le parent la rend conditionnellement (le
 * critère posé sans contrepartie). Le composant ne pose RIEN lui-même —
 * l'écriture revient au parent (`onDeclarer`), le retrait aussi
 * (`onSansFiltre`). Jamais d'écriture forcée : la porte « Sans filtre » reste
 * explicite, et un monde entier reste visible sans filtre.
 */

export const SELECT_CLASS =
  'w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 text-sm text-content';
// Les portes secondaires sont des vraies cibles tactiles (invariant ≥ 44 px).
export const LIEEN_CLASS =
  'inline-flex min-h-[44px] items-center text-xs font-medium text-coral hover:text-coral-dark';

export interface QuestionPortesIdentiteProps {
  /** Le critère posé qui attend sa contrepartie — un critère par côté (#519). */
  critère: 'genre' | 'orientation';
  /** Porte « Sans filtre » : abandonner le critère pendu, poser rien. */
  onSansFiltre: () => void;
  /**
   * Porte « Déclarer » : ÉCRIRE (ou retenir, au tunnel) la déclaration ET
   * poser le critère — renvoie false si l'écriture a échoué, la question
   * reste ouverte. Rien ne se force : une déclaration vide ne se pose pas.
   */
  onDeclarer: (valeur: string | string[]) => Promise<boolean>;
  /** Art. 9 déjà consenti ? Sinon la case vient dans la question (#425). */
  sensitiveConsent?: boolean;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function QuestionPortesIdentite({
  critère,
  onSansFiltre,
  onDeclarer,
  sensitiveConsent = true,
}: QuestionPortesIdentiteProps) {
  const [porteOuverte, setPorteOuverte] = useState(false);
  const [genre, setGenre] = useState('');
  const [orientations, setOrientations] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState('');
  const [erreurPose, setErreurPose] = useState('');
  const [attente, setAttente] = useState(false);

  const questionText = critère === 'genre' ? MIRROR_COPY.genreCritere : MIRROR_COPY.orientationCritere;
  const idChamp = `ton-${critère}-a-declarer`;
  const boutonPorte = critère === 'genre' ? 'Déclarer mon genre' : 'Déclarer mon orientation';

  async function declarer() {
    if (critère === 'genre' && genre === '') {
      setErreurPose('Choisis ton genre pour enregistrer.');
      return;
    }
    if (critère === 'orientation' && orientations.length === 0) {
      setErreurPose('Choisis ton orientation pour enregistrer.');
      return;
    }
    if (!sensitiveConsent && !consent) {
      setConsentError(COPY_CONSENT_SENSIBLE.requis);
      return;
    }
    setAttente(true);
    setConsentError('');
    setErreurPose('');
    try {
      const ok = await onDeclarer(critère === 'genre' ? genre : orientations);
      if (!ok) {
        setErreurPose('Impossible d’enregistrer, réessaie.');
        return;
      }
      // Porte prise : la question se referme entièrement, y compris la
      // déclaration retenue (l'étape 2 la porte au PUT de sa suite).
      setPorteOuverte(false);
      setGenre('');
      setOrientations([]);
      setConsent(false);
      setConsentError('');
      setErreurPose('');
    } finally {
      setAttente(false);
    }
  }

  return (
    <div className="mt-2">
      <p className="mb-2 text-sm text-muted">{questionText}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="primary" size="sm" onClick={() => setPorteOuverte(true)}>
          {boutonPorte}
        </Button>
        <button type="button" onClick={onSansFiltre} className={LIEEN_CLASS}>
          Sans filtre
        </button>
      </div>
      {porteOuverte && (
        <div className="mt-2 space-y-2">
          {critère === 'genre' ? (
            <>
              <label htmlFor={idChamp} className="text-xs font-semibold uppercase tracking-wider text-muted">Ton genre</label>
              <select id={idChamp} value={genre} onChange={(e) => { setGenre(e.target.value); setConsentError(''); setErreurPose(''); }} className={SELECT_CLASS}>
                {/* « Je ne souhaite pas le préciser » est un silence, pas une
                    déclaration (#519) : l'option d'ouverture reste, la porte de
                    secours = « Sans filtre ». */}
                <option value="">Choisis…</option>
                {GENDER_OPTIONS.filter((g) => g.value !== '').map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </>
          ) : (
            <>
              <p id={idChamp} className="text-xs font-semibold uppercase tracking-wider text-muted">Ton orientation</p>
              <div role="group" aria-labelledby={idChamp} className="flex flex-wrap gap-1.5">
                {ORIENTATION_OPTIONS.map((opt) => (
                  <TagButton
                    key={opt}
                    label={cap(opt)}
                    selected={orientations.includes(opt)}
                    onClick={() => { setOrientations(toggleLocal(orientations, opt)); setConsentError(''); setErreurPose(''); }}
                  />
                ))}
              </div>
            </>
          )}
          {!sensitiveConsent && (
            <ConsentSensibleField checked={consent} onChange={(v) => { setConsent(v); setConsentError(''); }} error={consentError} />
          )}
          {erreurPose && <p role="alert" className="text-xs text-error">{erreurPose}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="primary" size="sm" loading={attente} onClick={() => void declarer()}>
              Enregistrer et filtrer
            </Button>
            <button type="button" onClick={onSansFiltre} className={LIEEN_CLASS}>
              Annuler
            </button>
          </div>
        </div>
      )}
      <p className="mt-2 text-xs text-muted">Sans filtre, tout le monde reste visible.</p>
    </div>
  );
}

function toggleLocal<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}