'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StepPhoto from '@/components/onboarding/StepPhoto';
import StepSeeking, { type SeekingPayload } from '@/components/onboarding/StepSeeking';
import StepPosition from '@/components/onboarding/StepPosition';
import StepPush from '@/components/onboarding/StepPush';
import { mustOnboard, ONBOARDING_DONE } from '@/lib/onboarding';

/**
 * Le premier quart d'heure (spec 005) : trois étapes passables, puis la
 * proposition push. L'avancement vit en base (`onboardingStep`) et s'écrit à
 * chaque passage AVANT d'afficher la suite — un rechargement reprend là où on
 * en était, depuis n'importe quel appareil. Aucune API nouvelle : chaque
 * étape passe par les routes du profil.
 */
type Phase = 'loading' | 0 | 1 | 2 | 'push';

async function putProfile(body: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch('/api/users/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export default function BienvenuePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('loading');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/users/profile');
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (cancelled) return;
        setDisplayName(data.displayName ?? '');
        if (!mustOnboard(data.profile)) {
          router.replace('/discover');
          return;
        }
        const step = Math.min(2, Math.max(0, data.profile?.onboardingStep ?? 0)) as 0 | 1 | 2;
        setPhase(step);
      } catch {
        if (!cancelled) setPhase(0);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Une seule lecture au montage : l'avancement bouge ensuite localement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Écrit l'avancement (et une saisie éventuelle) puis passe à la suite. */
  async function advance(to: 1 | 2 | 3, extra: Record<string, unknown> = {}) {
    setError('');
    const ok = await putProfile({ ...extra, onboardingStep: to });
    if (!ok) {
      setError('Impossible d’enregistrer, réessaie.');
      return;
    }
    setPhase(to === ONBOARDING_DONE ? 'push' : to);
  }

  if (phase === 'loading') return null;

  return (
    <>
      {error && (
        <p role="alert" className="mx-auto max-w-lg px-4 pt-4 text-sm text-error">
          {error}
        </p>
      )}
      {phase === 0 && <StepPhoto displayName={displayName} onDone={() => void advance(1)} />}
      {phase === 1 && (
        <StepSeeking
          onContinue={(payload: SeekingPayload) => advance(2, { ...payload })}
          onLater={() => void advance(2)}
        />
      )}
      {phase === 2 && <StepPosition onDone={() => void advance(3)} />}
      {phase === 'push' && <StepPush onDone={() => router.replace('/discover')} />}
    </>
  );
}
