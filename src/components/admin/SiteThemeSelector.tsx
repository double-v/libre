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
      <legend className="text-sm font-medium text-muted">
        Thème du site
      </legend>
      {SITE_THEMES.map((theme: SiteTheme) => (
        <label
          key={theme.id}
          className="flex cursor-pointer items-start gap-3 rounded-lg border border-hairline bg-surface p-3 transition-colors hover:border-coral has-[:checked]:border-coral has-[:checked]:bg-blush dark:hover:border-coral dark:has-[:checked]:bg-coral/10"
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
            <span className="block text-sm font-medium text-content">
              {theme.label}
            </span>
            <span className="block text-xs text-muted">
              {theme.description}
            </span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
