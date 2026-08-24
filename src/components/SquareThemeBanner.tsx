'use client';

import { useState, useEffect } from 'react';

import { msUntilNextReset } from '@/lib/square/reset-clock';

export interface ThemeInfo {
  themeId: string;
  label: string;
  description: string;
  inputType: string;
  placeholder: string;
  maxLength: number;
  allowFreeText: boolean;
  options: string[] | null;
  pseudonymNames?: string[] | null;
}

function formatCountdown(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes.toString().padStart(2, '0')}min`;
}

export default function SquareThemeBanner({
  theme,
  pseudonym,
}: {
  theme: ThemeInfo | null;
  pseudonym: string;
}) {
  const [countdown, setCountdown] = useState(() => msUntilNextReset());

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(msUntilNextReset());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!theme) {
    return (
      <div className="shrink-0 border-b border-hairline bg-blush px-4 py-2 dark:bg-coral/5">
        <p className="mx-auto w-full max-w-reading text-sm text-muted">Chargement du thème…</p>
      </div>
    );
  }

  const hoursRemaining = countdown / 3600000;
  const showCountdown = hoursRemaining < 23;

  return (
    <div className="shrink-0 border-b border-hairline bg-blush px-4 py-2 dark:bg-coral/5">
      {/* Le bandeau tient la largeur de la Place, son texte reste à la colonne
          de lecture du fil (#348) — sinon il court sur 1080px. */}
      <div className="mx-auto w-full max-w-reading">
        <p className="text-sm font-medium text-coral dark:text-coral-light">
          🎭 {theme.label}
        </p>
        <p className="text-xs text-muted">{theme.description}</p>
        <p className="text-xs text-muted">
          Tu es : <span className="font-medium text-muted">{pseudonym}</span>
        </p>
        {showCountdown && (
          <p className="text-xs text-muted">
            🔄 Réinitialisation dans {formatCountdown(countdown)}
          </p>
        )}
      </div>
    </div>
  );
}