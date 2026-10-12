'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import HeartMark from '@/components/ui/HeartMark';
import ConsentSensibleField, { COPY_CONSENT_SENSIBLE } from '@/components/ConsentSensibleField';
import TagButton from '@/components/TagButton';
import { GENDER_OPTIONS, ORIENTATION_OPTIONS } from '@/lib/taxonomy';
import { NUDGE_IDENTITE_COPY, type IdentiteManquante } from '@/lib/onboarding';
import { toast } from '@/lib/toast';

/**
 * Carte « dis qui tu es » (#517) : le rang d'identité de la relance, dans
 * « Pour toi ». Premier rang disponible seulement une fois photo, type de
 * relation et position posés — cf. `deriveMissing` + `deriveIdentite`.
 *
 * La déclaration se fait dans la carte : c'est toute la point du nudge —
 * deux pages d'écart et la relance meurt. Même écriture que partout
 * (`PUT /api/users/profile`), consentement art. 9 en ligne (case jamais
 * pré-cochée), et la porte de secours est explicite : « Plus tard » écarte
 * la carte 7 jours et l'app reste entière sans filtre pour la personne.
 * L'absence reste invisible sur les fiches : la carte n'annonce l'effet
 * qu'à sa propriétaire, dans la copie de `NUDGE_IDENTITE_COPY`.
 */
export interface IdentiteNudgeCardProps {
  kind: IdentiteManquante;
  /** La personne a-t-elle déjà consenti (art. 9) ? Sinon la case vient dans la carte. */
  consentSensible: boolean;
  /** Déclaration enregistrée : le parent referme, et sait qu'un champ a bougé. */
  onDeclared: (champ: 'genderIdentity' | 'orientation') => void;
  onDismiss: () => void;
}

export default function IdentiteNudgeCard({ kind, consentSensible, onDeclared, onDismiss }: IdentiteNudgeCardProps) {
  const copy = NUDGE_IDENTITE_COPY[kind];
  const [genre, setGenre] = useState('');
  const [orientations, setOrientations] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const rempli = kind === 'genre' ? genre !== '' : orientations.length > 0;

  async function enregistrer() {
    if (!rempli) {
      setError(kind === 'genre' ? 'Choisis ton genre pour enregistrer.' : 'Choisis ton orientation pour enregistrer.');
      return;
    }
    if (!consentSensible && !consent) {
      setConsentError(COPY_CONSENT_SENSIBLE.requis);
      return;
    }
    setBusy(true);
    setError('');
    try {
      // « genre à '' » est un silence, jamais une déclaration : on n'envoie
      // que ce qui manque et la personne a choisi. Repli art. 9 : la case
      // voyagera avec la valeur, dans la même requête que partout (#425).
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(kind === 'genre' ? { genderIdentity: genre } : { orientation: orientations }),
          ...(consentSensible ? {} : { sensitiveConsent: true as const }),
        }),
      });
      if (!res.ok) throw new Error();
      toast('Profil enregistré.');
      onDeclared(kind === 'genre' ? 'genderIdentity' : 'orientation');
    } catch {
      setError('Impossible d’enregistrer, réessaie.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card as="article" variant="media" aria-label="Se déclarer" className="flex h-full flex-col">
      <div className="flex min-h-[88px] flex-1 items-center justify-center bg-sunken px-4 py-5">
        <HeartMark className="h-9 w-9 text-coral" aria-hidden="true" />
      </div>
      <div className="flex flex-col px-4 pb-4 pt-3.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Ton profil</p>
        <h3 className="mt-1 text-lg font-semibold text-content">{copy.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{copy.body}</p>

        <div className="mt-3 space-y-2">
          {kind === 'genre' ? (
            <label htmlFor="nudge-identite-champ" className="text-xs font-semibold uppercase tracking-wider text-muted">{copy.champ}</label>
          ) : (
            <p id="nudge-identite-champ" className="text-xs font-semibold uppercase tracking-wider text-muted">{copy.champ}</p>
          )}
          {kind === 'genre' ? (
            <select
              id="nudge-identite-champ"
              value={genre}
              onChange={(e) => { setGenre(e.target.value); setError(''); }}
              className="mt-1 block w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 text-sm text-content"
            >
              {/* « Je ne souhaite pas le préciser » est un silence, pas une
                  déclaration (#519) : l'option vide d'ouverture et la porte de
                  secours = « Plus tard ». Sans elle, le select pré-sélectionnerait
                  la première valeur sans qu'on ait choisi. */}
              <option value="">Choisis…</option>
              {GENDER_OPTIONS.filter((g) => g.value !== '').map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : (
            <div role="group" aria-labelledby="nudge-identite-champ" className="flex flex-wrap gap-1.5">
              {ORIENTATION_OPTIONS.map((opt) => (
                <TagButton
                  key={opt}
                  label={opt.charAt(0).toUpperCase() + opt.slice(1)}
                  selected={orientations.includes(opt)}
                  onClick={() => setOrientations(orientations.includes(opt) ? orientations.filter((o) => o !== opt) : [...orientations, opt])}
                />
              ))}
            </div>
          )}
          {error && <p role="alert" className="text-xs text-error">{error}</p>}
        </div>

        {!consentSensible && (
          <div className="mt-3">
            <ConsentSensibleField checked={consent} onChange={(v) => { setConsent(v); setConsentError(''); }} error={consentError} />
          </div>
        )}

        <div className="mt-auto flex flex-col gap-1.5 pt-3.5">
          <Button type="button" variant="primary" fullWidth onClick={() => void enregistrer()} loading={busy}>
            Enregistrer
          </Button>
          <Button type="button" variant="ghost" fullWidth onClick={onDismiss}>
            Plus tard
          </Button>
        </div>
      </div>
    </Card>
  );
}