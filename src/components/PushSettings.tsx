'use client';

import { useCallback, useEffect, useState } from 'react';
import { disablePush, enablePush, getPushState, type PushState } from '@/lib/push/client';

/**
 * PushSettings — « Me prévenir hors de l'app » (#392, spec 003 R12).
 *
 * Un réglage PAR APPAREIL, pas un réglage de compte : l'état vient du
 * navigateur (`getPushState`), et activer ici n'active rien ailleurs.
 * Rien n'est demandé au montage (FR-015) : la permission ne se sollicite
 * que sur le clic, dans le gestionnaire — c'est ce que les navigateurs
 * exigent, et c'est ce que la charte veut (opt-in, jamais d'appât).
 * Motif de switch identique au « Mode invisible » de la page.
 */

const COPY: Record<Exclude<PushState, 'off'>, string> = {
  unsupported: 'Ton navigateur ne permet pas les notifications.',
  'ios-not-installed':
    'Sur iPhone, ajoute d’abord Libre à ton écran d’accueil (Partager → Sur l’écran d’accueil), puis reviens ici.',
  denied: 'Les notifications sont bloquées dans les réglages de ton appareil pour Libre.',
  on: 'Tu seras prévenu·e ici en cas de nouveau message ou de nouveau match.',
};

const OFF_COPY = 'Une notification en cas de nouveau message ou de nouveau match, sur cet appareil. Jamais le contenu.';

export default function PushSettings() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPushState()
      .then((s) => { if (!cancelled) setState(s); })
      .catch(() => { if (!cancelled) setState('unsupported'); });
    return () => { cancelled = true; };
  }, []);

  const toggle = useCallback(async () => {
    if (busy || state === null) return;
    setBusy(true);
    try {
      setState(state === 'on' ? await disablePush() : await enablePush());
    } catch {
      // Les deux fonctions ne lèvent pas ; ceinture.
    } finally {
      setBusy(false);
    }
  }, [busy, state]);

  const on = state === 'on';
  const canToggle = state === 'on' || state === 'off';
  const copy = state === null ? '' : state === 'off' ? OFF_COPY : COPY[state];

  return (
    <section className="rounded-xl border border-hairline bg-surface p-4 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 id="push-settings-title" className="text-lg font-semibold text-content">Me prévenir hors de l’app</h2>
          <p className="mt-1 text-sm text-muted" aria-live="polite">{copy}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby="push-settings-title"
          disabled={busy || !canToggle}
          onClick={toggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2 disabled:opacity-50 motion-reduce:transition-none ${
            on ? 'bg-coral' : 'bg-fill-subtle'
          }`}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out motion-reduce:transition-none ${
              on ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </section>
  );
}
