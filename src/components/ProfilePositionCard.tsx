'use client';

import { useState } from 'react';
import ProfileSection from '@/components/ProfileSection';
import Button from '@/components/ui/Button';
import CityPicker from '@/components/ui/CityPicker';
import type { CityCandidate } from '@/lib/geocoding';

/**
 * Section « Ta position » du profil (spec 004, #405/#407).
 *
 * Dit toujours d'où vient la position courante (FR-005) — ville saisie,
 * appareil, ou rien — et permet de choisir / changer / retirer une ville.
 * « La dernière source qui parle » : la carte ne fait qu'afficher ce que le
 * serveur sait ; c'est `/api/geoloc/update` et `PUT city` qui tranchent.
 */

export type PositionSource = 'device' | 'city' | null;

export interface ProfilePositionCardProps {
  positionSource: PositionSource;
  cityLabel: string | null;
  invisibleMode: boolean;
  /** Le profil est rechargé par le parent après chaque écriture. */
  onChanged: () => void | Promise<void>;
  /** Injectable pour les tests. */
  saveCity?: (city: CityCandidate | null) => Promise<void>;
  search?: (q: string) => Promise<CityCandidate[]>;
}

export const POSITION_COPY = {
  title: 'Ta position',
  hint: 'Sert à « À proximité », au filtre de distance et aux croisements. Personne ne voit ta ville, seulement une distance arrondie.',
  none: 'Aucune position',
  noneSub: 'Active ta géolocalisation depuis Découvrir, ou indique ta ville ici.',
  city: (label: string) => `Ta ville : ${label}`,
  citySub: 'Position choisie à la main. Si tu actives la géolocalisation, elle prendra le relais.',
  device: 'Position de ton appareil',
  deviceSub: 'Brouillée sur ton appareil, arrondie au kilomètre. Mise à jour depuis Découvrir.',
  invisible: 'Mode invisible activé : ta position n’est pas utilisée tant qu’il l’est.',
  change: 'Changer de ville',
  useCity: 'Indiquer une ville à la place',
  remove: 'Retirer',
  cancel: 'Annuler',
  error: 'Impossible d’enregistrer ta ville, réessaie plus tard.',
} as const;

export async function defaultSaveCity(city: CityCandidate | null): Promise<void> {
  const res = await fetch('/api/users/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ city }),
  });
  if (!res.ok) throw new Error(`city_save_${res.status}`);
}

function PinIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-7-6.2-7-11a7 7 0 1114 0c0 4.8-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.6" fill={filled ? 'currentColor' : 'none'} />
    </svg>
  );
}

export default function ProfilePositionCard({
  positionSource,
  cityLabel,
  invisibleMode,
  onChanged,
  saveCity = defaultSaveCity,
  search,
}: ProfilePositionCardProps) {
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Un profil d'avant la feature a une position sans source : c'est l'appareil.
  const source: PositionSource = positionSource ?? null;
  const hasCity = source === 'city' && !!cityLabel;

  async function write(city: CityCandidate | null) {
    setBusy(true);
    setError(null);
    try {
      await saveCity(city);
      setPicking(false);
      await onChanged();
    } catch {
      setError(POSITION_COPY.error);
    } finally {
      setBusy(false);
    }
  }

  const title = hasCity ? POSITION_COPY.city(cityLabel) : source === 'device' ? POSITION_COPY.device : POSITION_COPY.none;
  const sub = invisibleMode
    ? POSITION_COPY.invisible
    : hasCity
      ? POSITION_COPY.citySub
      : source === 'device'
        ? POSITION_COPY.deviceSub
        : POSITION_COPY.noneSub;

  return (
    <ProfileSection sectionId="position" title={POSITION_COPY.title} surface="blush" complete={source !== null}>
      <p className="mt-1 text-xs text-muted">{POSITION_COPY.hint}</p>

      <div className="panel-flush mt-3 flex items-start gap-3">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-hairline bg-surface text-coral dark:text-coral-light">
          <PinIcon filled={source !== null && !invisibleMode} />
        </span>
        <div>
          <p className="text-base font-semibold text-content">{title}</p>
          <p className="mt-0.5 text-sm text-muted">{sub}</p>
        </div>
      </div>

      {picking || source === null ? (
        <div className="mt-3">
          <CityPicker onSelect={(c) => write(c)} search={search} autoFocus={picking} />
          {picking && (
            <div className="mt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setPicking(false)} disabled={busy}>
                {POSITION_COPY.cancel}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => setPicking(true)} disabled={busy}>
            {hasCity ? POSITION_COPY.change : POSITION_COPY.useCity}
          </Button>
          {hasCity && (
            <Button type="button" variant="ghost" size="sm" onClick={() => write(null)} loading={busy}>
              {POSITION_COPY.remove}
            </Button>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-error">
          {error}
        </p>
      )}
    </ProfileSection>
  );
}
