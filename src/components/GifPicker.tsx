'use client';

/**
 * GifPicker — modal de recherche/sélection de GIFs via GIPHY.
 *
 * Migration Tenor → GIPHY v1 (Tenor API shuts down June 30, 2026).
 * GIPHY a racheté Tenor en 2018 et fournit un guide de migration officiel
 * https://developers.giphy.com/docs/api/tenor-migration
 *
 * Affiche un input avec debounce 300ms (recherche côté serveur
 * /api/place/gifs/search) + un onglet Trending par défaut
 * (/api/place/gifs/trending) + une grille de résultats cliquables.
 *
 * Accessibilité :
 *  - `role="dialog"` + `aria-modal="true"` + `aria-label`
 *  - ESC pour fermer
 *  - Click sur le backdrop ferme
 *  - Focus reste dans le modal (focus trap léger via le input autofocus)
 *
 * Au clic sur un GIF, appelle `onSelect({ url, id, title })` puis ferme.
 */

import { useEffect, useRef, useState } from 'react';

export interface SelectedGif {
  id: string;
  url: string;
  title: string;
}

interface GiphyGif {
  id: string;
  title: string;
  url: string;
  format: 'mp4' | 'gif' | 'webp';
  width: number;
  height: number;
}

interface GiphyResponse {
  gifs: GiphyGif[];
  notConfigured: boolean;
}

type Mode = 'trending' | 'search';

export default function GifPicker({
  onSelect,
  onClose,
}: {
  onSelect: (gif: SelectedGif) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>('trending');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Si l'input est vide en mode search, on retombe sur trending — ajusté pendant
  // le rendu (pattern React officiel « adjust state during render »), pas dans un
  // effet (react-hooks/set-state-in-effect). Converge : setMode → mode='trending'
  // → condition fausse au rendu suivant.
  if (mode === 'search' && query.trim().length === 0) {
    setMode('trending');
  }

  // Debounce 300ms sur la query de recherche
  useEffect(() => {
    if (mode !== 'search') return;
    const trimmed = query.trim();
    if (trimmed.length === 0) return;
    const timer = setTimeout(() => setDebouncedQuery(trimmed), 300);
    return () => clearTimeout(timer);
  }, [query, mode]);

  // Fetch à chaque changement de mode/debouncedQuery
  useEffect(() => {
    let cancelled = false;
    const endpoint =
      mode === 'trending'
        ? `/api/place/gifs/trending?limit=24`
        : `/api/place/gifs/search?q=${encodeURIComponent(debouncedQuery)}&limit=24`;

    // IIFE async → pas de setState synchrone dans le corps de l'effet
    // (react-hooks/set-state-in-effect, cf. #179/#193).
    void (async () => {
      setLoading(true);
      setError(null);
      setNotConfigured(false);
      try {
        const res = await fetch(endpoint);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as GiphyResponse;
        if (cancelled) return;
        setNotConfigured(data.notConfigured);
        setGifs(data.gifs ?? []);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        setGifs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, debouncedQuery]);

  // Autofocus sur l'input à l'ouverture + ESC pour fermer
  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choisir un GIF"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        // Click sur le backdrop ferme (mais pas sur le contenu)
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-[80vh] w-full max-w-2xl flex-col rounded-lg bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
          <h2 className="text-base font-semibold text-content">
            Choisir un GIF
          </h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="rounded p-1 text-muted hover:bg-fill-subtle hover:text-muted"
          >
            ✕
          </button>
        </div>

        {/* Search input */}
        <div className="border-b border-hairline px-4 py-3">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim().length > 0) {
                setMode('search');
              } else {
                setMode('trending');
              }
            }}
            placeholder="Rechercher un GIF…"
            className="w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 text-sm text-content placeholder-gray-400 focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
          />
          {mode === 'search' && debouncedQuery && (
            <p className="mt-1 text-xs text-muted">
              Résultats pour « {debouncedQuery} »
            </p>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {notConfigured && (
            <div className="mb-3 rounded-md bg-yellow-50 px-3 py-2 text-xs text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
              ⚠️ Clé GIPHY non configurée. Les GIFs sont temporairement
              indisponibles.
            </div>
          )}

          {loading && (
            <p className="py-8 text-center text-sm text-muted">Chargement…</p>
          )}

          {error && !loading && (
            <p className="py-8 text-center text-sm text-red-500">
              Erreur : {error}
            </p>
          )}

          {!loading && !error && gifs.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">
              Aucun GIF trouvé.
            </p>
          )}

          {!loading && gifs.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {gifs.map((gif) => (
                <button
                  key={gif.id}
                  onClick={() =>
                    onSelect({ id: gif.id, url: gif.url, title: gif.title })
                  }
                  className="group relative aspect-square overflow-hidden rounded-md bg-fill-subtle focus:outline-none focus:ring-2 focus:ring-coral"
                  aria-label={gif.title || 'GIF'}
                >
                  {gif.format === 'mp4' ? (
                    <video
                      src={gif.url}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={gif.url}
                      alt={gif.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
