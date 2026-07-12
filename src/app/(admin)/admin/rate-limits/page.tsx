'use client';

import { useState, useEffect, useCallback } from 'react';

interface RateLimitSummary {
  key: string;
  count: number;
  firstAt: number;
  lastAt: number;
  limit: number;
  windowMs: number;
}

interface RateLimitsResponse {
  window: { from: number; to: number };
  totalHits: number;
  uniqueKeys: number;
  summary: RateLimitSummary[];
}

const WINDOW_PRESETS = [
  { label: '15 min', ms: 15 * 60 * 1000 },
  { label: '1 h', ms: 60 * 60 * 1000 },
  { label: '6 h', ms: 6 * 60 * 60 * 1000 },
  { label: '24 h', ms: 24 * 60 * 60 * 1000 },
];

/** Split a key like "geoloc:abcd-1234" into scope + id. */
function splitKey(key: string): { scope: string; id: string } {
  const idx = key.indexOf(':');
  if (idx < 0) return { scope: key, id: '' };
  return { scope: key.slice(0, idx), id: key.slice(idx + 1) };
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

function formatWindow(windowMs: number): string {
  if (windowMs >= 3_600_000) return `${Math.round(windowMs / 3_600_000)}h`;
  if (windowMs >= 60_000) return `${Math.round(windowMs / 60_000)}min`;
  return `${Math.round(windowMs / 1000)}s`;
}

export default function AdminRateLimitsPage() {
  const [windowMs, setWindowMs] = useState<number>(WINDOW_PRESETS[1].ms);
  const [data, setData] = useState<RateLimitsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHits = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const since = Date.now() - windowMs;
      const res = await fetch(`/api/admin/rate-limits?since=${since}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [windowMs]);

  useEffect(() => {
    // IIFE async → pas de setState synchrone dans le corps de l'effet
    // (react-hooks/set-state-in-effect, cf. #179/#193). Le refresh périodique
    // reste un setInterval classique (callback → hors corps synchrone).
    void (async () => {
      await fetchHits();
    })();
    const id = setInterval(fetchHits, 30_000); // auto-refresh every 30s
    return () => clearInterval(id);
  }, [fetchHits]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content">
            Rate-limits (429)
          </h1>
          <p className="mt-1 text-sm text-muted">
            Hits sur les 500 derniers événements, en mémoire. Auto-refresh 30s.
          </p>
        </div>
        <div className="flex gap-2">
          {WINDOW_PRESETS.map((preset) => (
            <button
              key={preset.ms}
              type="button"
              onClick={() => setWindowMs(preset.ms)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                windowMs === preset.ms
                  ? 'bg-coral text-white'
                  : 'bg-fill-subtle text-muted hover:bg-fill-subtle'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !data && (
        <div className="text-center text-muted">Chargement…</div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          Erreur : {error}
        </div>
      )}

      {data && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-hairline bg-surface p-4">
              <div className="text-xs uppercase text-muted">
                Total 429
              </div>
              <div className="mt-1 text-2xl font-bold text-content">
                {data.totalHits}
              </div>
            </div>
            <div className="rounded-lg border border-hairline bg-surface p-4">
              <div className="text-xs uppercase text-muted">
                Clés uniques
              </div>
              <div className="mt-1 text-2xl font-bold text-content">
                {data.uniqueKeys}
              </div>
            </div>
            <div className="rounded-lg border border-hairline bg-surface p-4">
              <div className="text-xs uppercase text-muted">
                Plus haut spike
              </div>
              <div className="mt-1 text-2xl font-bold text-content">
                {data.summary[0]?.count ?? 0}
              </div>
              {data.summary[0] && (
                <div className="mt-1 truncate font-mono text-xs text-muted">
                  {data.summary[0].key}
                </div>
              )}
            </div>
          </div>

          {data.summary.length === 0 ? (
            <div className="rounded-lg border border-hairline bg-surface p-8 text-center text-muted">
              Aucun 429 sur cette fenêtre. 👌
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-hairline bg-surface">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-fill-subtle">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted">
                      Scope
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted">
                      ID
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted">
                      Hits
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted">
                      Preset
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted">
                      Premier
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted">
                      Dernier
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {data.summary.map((row) => {
                    const { scope, id } = splitKey(row.key);
                    return (
                      <tr key={row.key} className="hover:bg-fill-subtle">
                        <td className="px-4 py-3">
                          <span className="rounded-md bg-fill-subtle px-2 py-0.5 font-mono text-xs text-muted">
                            {scope}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted">
                          <span className="block max-w-[12rem] truncate" title={id}>
                            {id || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-content">
                          {row.count}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-muted">
                          {row.limit}/{formatWindow(row.windowMs)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-muted">
                          {formatTime(row.firstAt)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-muted">
                          {formatTime(row.lastAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 text-xs text-muted">
            💡 Si tu vois un user légitime (mobile, script front) bloqué par un preset,
            c’est un signal que la limite est trop stricte pour ce scope. Si ce sont
            des bots, c’est que ça marche comme prévu.
          </p>
        </>
      )}
    </div>
  );
}
