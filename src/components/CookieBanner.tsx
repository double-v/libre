'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const COOKIE_CONSENT_KEY = 'libre_cookie_consent';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if user already consented
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) {
      // Lecture localStorage post-hydratation : SSR rend « masqué » (défaut),
      // révélé après montage client → un seul flip, SSR-safe intentionnel. Cf #193.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
    }
  }, []);

  function handleAccept() {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      accepted: true,
      date: new Date().toISOString(),
    }));
    setVisible(false);
  }

  function handleDecline() {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      accepted: false,
      date: new Date().toISOString(),
    }));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="alert"
      aria-label="Gestion des cookies"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white px-4 py-4 shadow-lg dark:border-gray-700 dark:bg-gray-900 sm:px-6"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Nous utilisons des cookies strictement nécessaires au fonctionnement du service
          (session, sécurité, préférences). Pas de cookie publicitaire ni de suivi.
          <Link href="/confidentialite#section-10" className="ml-1 text-coral hover:underline">
            En savoir plus
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={handleDecline}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Refuser
          </button>
          <button
            onClick={handleAccept}
            className="rounded-md bg-coral px-3 py-1.5 text-sm font-medium text-white hover:bg-terracotta"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}