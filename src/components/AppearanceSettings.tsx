'use client';

import { SITE_THEMES } from '@/lib/site-themes';
import { useThemePreference, type Mode } from '@/hooks/useThemePreference';

const MODES: { id: Mode; label: string }[] = [
  { id: 'auto', label: 'Auto (système)' },
  { id: 'light', label: 'Clair' },
  { id: 'dark', label: 'Sombre' },
];

// Thèmes prévisualisés dans leur mode sombre (identité dominante). Miroir du
// ThemeMenu (cf. src/components/ui/ThemeMenu.tsx).
const DARK_IDENTITY = new Set(['cartoon', 'arcade', 'retro']);

/**
 * Réglage d'apparence utilisateur : mode (clair/sombre/auto) × thème.
 *
 * Miroir « paramètres » du `ThemeMenu` : même source de vérité
 * (`useThemePreference` → `localStorage` + DOM + synchro best-effort du compte).
 * Le choix de thème est un signal doux, jamais gamifié (cf. PRODUCT.md, principe 4).
 */
export default function AppearanceSettings() {
  const { ready, mode, theme, setMode, setTheme } = useThemePreference();

  return (
    <section className="rounded-xl border border-hairline bg-surface p-4 sm:p-5">
      <h2 className="text-lg font-semibold text-content">
        Apparence
      </h2>
      <p className="mt-1 text-sm text-muted">
        Le mode clair/sombre et le thème visuel. Votre choix est gardé sur cet
        appareil (et synchronisé sur votre compte si vous êtes connecté).
      </p>

      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-medium text-muted">
          Mode
        </legend>
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <label
              key={m.id}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                ready && mode === m.id
                  ? 'border-coral bg-coral text-white'
                  : 'border-hairline-strong text-muted hover:border-coral'
              }`}
            >
              <input
                type="radio"
                name="libre-mode"
                value={m.id}
                checked={ready && mode === m.id}
                onChange={() => setMode(m.id)}
                className="sr-only"
              />
              {m.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-medium text-muted">
          Thème
        </legend>
        <div className="space-y-2">
          {SITE_THEMES.map((t) => (
            <label
              key={t.id}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-hairline bg-surface p-3 transition-colors hover:border-coral has-[:checked]:border-coral has-[:checked]:bg-blush dark:hover:border-coral dark:has-[:checked]:bg-coral/10"
            >
              <input
                type="radio"
                name="libre-skin"
                value={t.id}
                checked={ready && theme === t.id}
                onChange={() => setTheme(t.id)}
                className="mt-1 h-4 w-4 cursor-pointer accent-coral"
              />
              <span
                data-theme={t.id}
                aria-hidden="true"
                className={`${DARK_IDENTITY.has(t.id) ? 'dark ' : ''}relative mt-0.5 h-8 w-8 shrink-0 overflow-hidden rounded-full border border-hairline bg-background`}
              >
                <span className="absolute inset-y-0 right-0 w-1/2 bg-coral" />
                <span className="absolute left-[16%] top-[16%] h-[30%] w-[30%] rounded-full bg-gold" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-content">
                  {t.label}
                </span>
                <span className="block text-xs text-muted">
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
