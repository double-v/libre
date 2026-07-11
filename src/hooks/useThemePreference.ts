'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_SITE_THEME_ID, getSiteTheme } from '@/lib/site-themes';

/**
 * Source de vérité unique du theming (2 axes : Mode × Thème).
 *
 * Centralise get/set/apply du **mode** (`.dark` sur `<html>`, clé `libre-theme`)
 * et du **thème** (`data-theme` sur `<html>`, clé `libre-skin`). Remplace la
 * logique dupliquée de `ThemeToggle`, `AppearanceSettings`, `lobby-theme`.
 *
 * SSR-safe : au premier rendu on retourne les défauts, puis un effet aligne
 * l'état sur ce que le script no-flash de `layout.tsx` a déjà appliqué au DOM
 * (localStorage) — un seul flip, pas de mismatch d'hydratation (cf. #193).
 */

export type Mode = 'light' | 'dark' | 'auto';

const MODE_KEY = 'libre-theme';
const SKIN_KEY = 'libre-skin';

function prefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

/** Applique le mode : classe `.dark` sur `<html>`. 'auto' suit l'OS. */
function applyMode(mode: Mode): void {
  if (typeof document === 'undefined') return;
  const dark = mode === 'dark' || (mode === 'auto' && prefersDark());
  document.documentElement.classList.toggle('dark', dark);
}

/** Applique le thème : `data-theme` sur `<html>`. Les valeurs vivent en CSS. */
function applyTheme(id: string): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', id);
}

function readStoredMode(): Mode {
  if (typeof window === 'undefined') return 'auto';
  const stored = window.localStorage.getItem(MODE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'auto'
    ? stored
    : 'auto';
}

function readStoredTheme(): string {
  if (typeof document === 'undefined') return DEFAULT_SITE_THEME_ID;
  const stored =
    window.localStorage.getItem(SKIN_KEY) ??
    document.documentElement.getAttribute('data-theme') ??
    DEFAULT_SITE_THEME_ID;
  // Normalise via les alias de compat (ex: 'default' → 'libre').
  return getSiteTheme(stored)?.id ?? DEFAULT_SITE_THEME_ID;
}

export interface ThemePreference {
  /** `false` tant que l'état client n'a pas rejoint le DOM (SSR → défauts). */
  ready: boolean;
  mode: Mode;
  theme: string;
  setMode: (mode: Mode) => void;
  setTheme: (id: string) => void;
}

export function useThemePreference(): ThemePreference {
  const [ready, setReady] = useState(false);
  const [mode, setModeState] = useState<Mode>('auto');
  const [theme, setThemeState] = useState<string>(DEFAULT_SITE_THEME_ID);

  // Post-hydratation : on lit les préférences réelles (localStorage / DOM déjà
  // posé par le script no-flash) et on aligne l'UI. Le SSR a rendu les défauts →
  // un seul flip, pattern SSR-safe intentionnel, pas de mismatch (cf. #193).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setModeState(readStoredMode());
    setThemeState(readStoredTheme());
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Quand le mode est 'auto', suivre les bascules OS en direct.
  useEffect(() => {
    if (mode !== 'auto') return;
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => applyMode('auto');
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [mode]);

  const setMode = useCallback((next: Mode) => {
    setModeState(next);
    window.localStorage.setItem(MODE_KEY, next);
    applyMode(next);
  }, []);

  const setTheme = useCallback((id: string) => {
    const canonical = getSiteTheme(id)?.id ?? DEFAULT_SITE_THEME_ID;
    setThemeState(canonical);
    window.localStorage.setItem(SKIN_KEY, canonical);
    applyTheme(canonical);
    // Best-effort : synchronise le compte pour les autres appareils. Un échec
    // (hors-ligne, session expirée…) ne doit jamais casser le choix local.
    void fetch('/api/users/skin', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skin: canonical }),
    }).catch(() => {});
  }, []);

  return { ready, mode, theme, setMode, setTheme };
}
