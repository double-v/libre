'use client';

import { SITE_THEMES, type SiteTheme } from '@/lib/site-themes';

interface SiteThemeSelectorProps {
  current: string;
  onChange: (themeId: string) => void;
  disabled?: boolean;
}

export default function SiteThemeSelector({ current, onChange, disabled }: SiteThemeSelectorProps) {
  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Thème du site
      </legend>
      {SITE_THEMES.map((theme: SiteTheme) => (
        <label
          key={theme.id}
          className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-coral has-[:checked]:border-coral has-[:checked]:bg-blush dark:border-gray-700 dark:bg-gray-800 dark:hover:border-coral dark:has-[:checked]:bg-coral/10"
        >
          <input
            type="radio"
            name="site-theme"
            value={theme.id}
            checked={current === theme.id}
            onChange={() => onChange(theme.id)}
            className="mt-1 h-4 w-4 cursor-pointer accent-coral"
          />
          <span className="flex-1">
            <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
              {theme.label}
            </span>
            <span className="block text-xs text-gray-600 dark:text-gray-400">
              {theme.description}
            </span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
