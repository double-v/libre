'use client';

import { useState } from 'react';
import OnboardingShell from './OnboardingShell';
import CityPicker from '@/components/ui/CityPicker';
import { defaultSaveCity } from '@/components/ProfilePositionCard';
import { requestDevicePosition as defaultRequestDevicePosition, type DevicePositionResult } from '@/lib/geoloc-client';
import type { CityCandidate } from '@/lib/geocoding';

/**
 * Étape 3 — où tu es (spec 005, FR-009). L'appareil d'abord ; à l'échec, la
 * ville se déplie juste dessous (spec 004, mêmes routes, même précision
 * grossière). Rien n'est exigé.
 */
export interface StepPositionProps {
  onDone: () => void;
  requestDevicePosition?: () => Promise<DevicePositionResult>;
  saveCity?: (city: CityCandidate) => Promise<void>;
  searchCities?: (q: string) => Promise<CityCandidate[]>;
}

function OptionCard({ icon, title, hint, onClick, busy }: { icon: React.ReactNode; title: string; hint: string; onClick: () => void; busy?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="mb-2.5 flex min-h-[64px] w-full items-center gap-3.5 rounded-2xl border border-hairline-strong bg-surface px-4 py-3.5 text-left text-content transition-colors hover:border-coral-light focus:outline-none focus:ring-2 focus:ring-coral disabled:opacity-60"
    >
      <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-sunken text-coral">{icon}</span>
      <span>
        <strong className="block text-[15px] font-semibold">{title}</strong>
        <span className="mt-0.5 block text-[13px] text-muted">{hint}</span>
      </span>
    </button>
  );
}

export default function StepPosition({
  onDone,
  requestDevicePosition = defaultRequestDevicePosition,
  saveCity = defaultSaveCity,
  searchCities,
}: StepPositionProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cityOpen, setCityOpen] = useState(false);

  async function locateDevice() {
    setError('');
    setBusy(true);
    const result = await requestDevicePosition();
    setBusy(false);
    if (result.ok) {
      onDone();
      return;
    }
    setError(result.message);
    if (result.kind !== 'invisible') setCityOpen(true);
  }

  async function chooseCity(city: CityCandidate) {
    setError('');
    setBusy(true);
    try {
      await saveCity(city);
      onDone();
    } catch {
      setError("Impossible d'enregistrer ta ville, réessaie plus tard.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <OnboardingShell
      step={2}
      title="Où tu es"
      lead="Pour croiser des gens près de chez toi. Ta position est arrondie à l'échelle d'un quartier — jamais ton adresse."
      onLater={onDone}
    >
      <OptionCard
        busy={busy}
        onClick={() => void locateDevice()}
        title="Utiliser ma position"
        hint="Ton appareil te demandera l'autorisation."
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
          </svg>
        }
      />
      <OptionCard
        busy={busy}
        onClick={() => setCityOpen(true)}
        title="Saisir ma ville"
        hint="Si la géolocalisation ne marche pas, ou par choix."
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
          </svg>
        }
      />
      {error && (
        <p role="alert" className="mb-2 text-sm text-error">
          {error}
        </p>
      )}
      {cityOpen && (
        <div className="mb-2">
          <CityPicker label="Ta ville" placeholder="Ta ville" autoFocus onSelect={chooseCity} search={searchCities} />
        </div>
      )}
      <p className="mt-2.5 flex items-start gap-2 text-xs leading-snug text-muted">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mt-0.5 flex-none" aria-hidden="true">
          <rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span>Les autres membres voient une distance en tranche (« à moins de 5 km »), jamais un point sur une carte.</span>
      </p>
    </OnboardingShell>
  );
}
