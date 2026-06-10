'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import SiteThemeSelector from '@/components/admin/SiteThemeSelector';
import { useSiteThemeApply } from '@/hooks/useSiteThemeApply';
import { getSiteTheme } from '@/lib/site-themes';

export default function AdminAppearancePage() {
  const [current, setCurrent] = useState<string>('default');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Resolve the full SiteTheme for the currently-selected id. The theme
  // registry is bundled with the client, so we don't need a second fetch
  // — getCurrentSiteTheme is reserved for the server-side RootLayout.
  const currentTheme = useMemo(
    () => getSiteTheme(current) ?? getSiteTheme('default')!,
    [current],
  );

  // Live preview: as soon as `current` changes, apply the theme to <html>.
  useSiteThemeApply(currentTheme);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/site-config');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setCurrent(data.currentTheme);
    } catch {
      setError('Impossible de charger la configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleChange = async (themeId: string) => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/site-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentTheme: themeId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      const data = await res.json();
      setCurrent(data.currentTheme);
      setSuccess('Thème appliqué. Le changement est visible immédiatement et pour tous les visiteurs.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
        Apparence du site
      </h1>
      <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
        Choisissez le thème de couleur du site. Le changement s'applique
        immédiatement à votre écran et est enregistré pour tous les
        visiteurs.
      </p>

      {error && (
        <div role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="mb-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          {success}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">Chargement…</p>
      ) : (
        <SiteThemeSelector current={current} onChange={handleChange} disabled={saving} />
      )}

      <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
        <p className="mb-1 font-semibold">Note</p>
        <p>
          Cette page est réservée aux administrateurs. Les utilisateurs non-admin
          qui tentent d'accéder à l'API <code>PUT /api/admin/site-config</code>
          reçoivent un 403.
        </p>
      </div>
    </div>
  );
}
