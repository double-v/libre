'use client';

import { useState, useEffect } from 'react';

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

function getTimeUntilNextReset(): number {
  const now = new Date();
  const next3AM = new Date(now);
  next3AM.setHours(3, 0, 0, 0);
  // If it's already past 3 AM today, target tomorrow
  if (now.getHours() >= 3) {
    next3AM.setDate(next3AM.getDate() + 1);
  }
  return next3AM.getTime() - now.getTime();
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
  const [countdown, setCountdown] = useState(getTimeUntilNextReset());

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getTimeUntilNextReset());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!theme) {
    return (
      <div className="shrink-0 border-b border-gray-200 bg-blush px-4 py-2 dark:border-gray-700 dark:bg-coral/5">
        <p className="text-sm text-gray-500">Chargement du thème…</p>
      </div>
    );
  }

  const hoursRemaining = countdown / 3600000;
  const showCountdown = hoursRemaining < 23;

  return (
    <div className="shrink-0 border-b border-gray-200 bg-blush px-4 py-2 dark:border-gray-700 dark:bg-coral/5">
      <p className="text-sm font-medium text-coral dark:text-coral-light">
        🎭 {theme.label}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{theme.description}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Tu es : <span className="font-medium text-gray-600 dark:text-gray-300">{pseudonym}</span>
      </p>
      {showCountdown && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          🔄 Réinitialisation dans {formatCountdown(countdown)}
        </p>
      )}
    </div>
  );
}