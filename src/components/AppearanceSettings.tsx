'use client';

import { useEffect, useState } from 'react';
import { SITE_THEMES } from '@/lib/site-themes';

type Mode = 'auto' | 'light' | 'dark';

const MODE_KEY = 'libre-theme';
const SKIN_KEY = 'libre-skin';

const MODES: { id: Mode; label: string }[] = [
  { id: 'auto', label: 'Auto (système)' },
  { id: 'light', label: 'Clair' },
  { id: 'dark', label: 'Sombre' },
];

/** Applique le mode clair/sombre : `.dark` sur <html>. 'auto' suit l'OS. */
function applyMode(mode: Mode) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = mode === 'dark' || (mode === 'auto' && prefersDark);
  document.documentElement.classList.toggle('dark', dark);
}

/** Applique le skin : `data-theme` sur <html>. Les valeurs vivent en CSS. */
function applySkin(skin: string) {
  document.documentElement.setAttribute('data-theme', skin);
}

/**
 * Réglage d'apparence utilisateur : mode (clair/sombre/auto) × skin.
 * Persistance locale (localStorage) — la synchro compte (User.skin) viendra
 * dans une itération suivante. Le choix de skin est un signal doux, jamais
 * gamifié (cf. PRODUCT.md, principe 4).
 */
export default function AppearanceSettings() {
  const [mode, setMode] = useState<Mode>('auto');
  const [skin, setSkin] = useState<string>(SITE_THEMES[0].id);

  useEffect(() => {
    // Post-hydratation : on lit les préférences réelles (localStorage / DOM) et
    // on aligne l'UI. Le SSR rend les défauts → un seul flip, SSR-safe (cf. #193).
    const storedMode = localStorage.getItem(MODE_KEY);
    const m: Mode =
      storedMode === 'light' || storedMode === 'dark' || storedMode === 'auto'
        ? storedMode
        : 'auto';
    const currentSkin =
      localStorage.getItem(SKIN_KEY) ||
      document.documentElement.getAttribute('data-theme') ||
      SITE_THEMES[0].id;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(m);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSkin(currentSkin);
  }, []);

  function chooseMode(m: Mode) {
    setMode(m);
    localStorage.setItem(MODE_KEY, m);
    applyMode(m);
  }

  function chooseSkin(s: string) {
    setSkin(s);
    localStorage.setItem(SKIN_KEY, s);
    applySkin(s);
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-5">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Apparence
      </h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Le mode clair/sombre et le thème visuel. Votre choix est gardé sur cet
        appareil.
      </p>

      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Mode
        </legend>
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <label
              key={m.id}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === m.id
                  ? 'border-coral bg-coral text-white'
                  : 'border-gray-300 text-gray-700 hover:border-coral dark:border-gray-600 dark:text-gray-300'
              }`}
            >
              <input
                type="radio"
                name="libre-mode"
                value={m.id}
                checked={mode === m.id}
                onChange={() => chooseMode(m.id)}
                className="sr-only"
              />
              {m.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Thème
        </legend>
        <div className="space-y-2">
          {SITE_THEMES.map((t) => (
            <label
              key={t.id}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-coral has-[:checked]:border-coral has-[:checked]:bg-blush dark:border-gray-700 dark:bg-gray-800 dark:hover:border-coral dark:has-[:checked]:bg-coral/10"
            >
              <input
                type="radio"
                name="libre-skin"
                value={t.id}
                checked={skin === t.id}
                onChange={() => chooseSkin(t.id)}
                className="mt-1 h-4 w-4 cursor-pointer accent-coral"
              />
              <span className="flex-1">
                <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                  {t.label}
                </span>
                <span className="block text-xs text-gray-600 dark:text-gray-400">
                  {t.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
