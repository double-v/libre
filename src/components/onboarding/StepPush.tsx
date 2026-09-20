'use client';

import { useEffect, useState } from 'react';
import OnboardingShell from './OnboardingShell';
import HeartMark from '@/components/ui/HeartMark';
import { enablePush as defaultEnablePush, getPushState as defaultGetPushState, type PushState } from '@/lib/push/client';
import { getPushSupport as defaultGetPushSupport, type PushSupport } from '@/lib/push/platform';
import { PUSH_ASKED_KEY, readStoredDate, writeStoredDate } from '@/lib/onboarding';

/**
 * Proposition push en fin de parcours (spec 005, FR-013 à FR-016, #411).
 * Le match est le seul événement notifié ; la copie dit ce qu'on ne fera pas.
 * Une fois par appareil : le refus se mémorise ici, Paramètres reste la porte.
 * Appareil incompatible, push déjà actif ou refusé au niveau navigateur →
 * l'écran ne s'affiche pas et on passe.
 */
export interface StepPushProps {
  onDone: () => void;
  getPushSupport?: () => PushSupport;
  getPushState?: () => Promise<PushState>;
  enablePush?: () => Promise<PushState>;
}

export default function StepPush({
  onDone,
  getPushSupport = defaultGetPushSupport,
  getPushState = defaultGetPushState,
  enablePush = defaultEnablePush,
}: StepPushProps) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const support = getPushSupport();
      const asked = readStoredDate(PUSH_ASKED_KEY);
      if (!support.supported || asked) {
        onDone();
        return;
      }
      const state = await getPushState();
      if (cancelled) return;
      if (state === 'on' || state === 'denied' || state === 'unsupported' || state === 'ios-not-installed') {
        onDone();
        return;
      }
      setVisible(true);
    })();
    return () => {
      cancelled = true;
    };
    // onDone est stable côté page ; on ne relance pas la décision à chaque rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function accept() {
    setBusy(true);
    try {
      await enablePush();
    } finally {
      writeStoredDate(PUSH_ASKED_KEY);
      setBusy(false);
      onDone();
    }
  }

  function later() {
    writeStoredDate(PUSH_ASKED_KEY);
    onDone();
  }

  if (!visible) return null;

  return (
    <OnboardingShell
      title="Être prévenu·e si ça matche ?"
      lead="Une notification sur cet appareil, seulement quand c'est réciproque. Rien d'autre : pas de relance, pas d'activité des autres, jamais."
      primary={{ label: 'Oui, sur cet appareil', onClick: () => void accept(), loading: busy }}
      onLater={later}
    >
      <div className="mb-5 grid h-[120px] place-items-center rounded-card bg-sunken">
        <HeartMark className="h-[52px] w-[52px] text-coral" aria-hidden="true" />
      </div>
      <p className="text-center text-xs leading-snug text-muted">Tu pourras changer d&apos;avis dans Paramètres.</p>
    </OnboardingShell>
  );
}
