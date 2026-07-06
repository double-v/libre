'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Interrupteur global de La Place (admin). Coupe l'espace pour tout le monde.
 * Note : même activée, La Place est masquée de la navigation des membres tant
 * qu'il y a moins de 2 personnes en ligne (voir /api/square/availability).
 */
export default function AdminSquareAvailability() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/site-config');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEnabled(Boolean(data.squareEnabled));
    } catch {
      setError('Impossible de charger la configuration.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggle() {
    if (enabled === null || saving) return;
    const next = !enabled;
    setEnabled(next); // optimiste
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/site-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ squareEnabled: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setEnabled(!next); // rollback
      setError('Une erreur est survenue, réessaie.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            La Place activée
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Coupe l&apos;espace pour tous les membres. Même activée, La Place reste
            masquée de la navigation tant qu&apos;il y a moins de 2 personnes en ligne.
          </p>
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled ?? false}
          aria-label="Activer La Place"
          disabled={enabled === null || saving}
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2 disabled:opacity-50 ${
            enabled ? 'bg-coral' : 'bg-gray-200 dark:bg-gray-600'
          }`}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </section>
  );
}
