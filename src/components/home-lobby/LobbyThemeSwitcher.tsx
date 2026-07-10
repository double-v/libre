'use client';

import { LOBBY_THEMES, type LobbyThemeId } from './lobby-theme';

interface LobbyThemeSwitcherProps {
  /** Thème lobby actif (pour l'état pressé des pills). */
  value: LobbyThemeId;
  /** Appelé au clic sur une pill. */
  onChange: (id: LobbyThemeId) => void;
  className?: string;
}

/**
 * Switcher de thème de la landing « lobby » (cartoon / arcade / retro). Portée
 * landing uniquement — n'affecte ni le mode (`.dark`) ni le skin app (`data-theme`).
 *
 * A11y : `role="group"` + libellé ; chaque pill est un vrai `<button>` avec
 * `aria-pressed`, focus ring coral (`:focus-visible`), cible tactile ≥ 44px.
 * Le rendu s'appuie sur les classes `.lobby-switcher*` de `globals.css` (tokens
 * `--lobby-*`, zéro hex inline).
 */
export default function LobbyThemeSwitcher({
  value,
  onChange,
  className = '',
}: LobbyThemeSwitcherProps) {
  return (
    <div
      role="group"
      aria-label="Aperçu du thème de la page"
      className={`lobby-switcher ${className}`.trim()}
    >
      <span className="lobby-switcher__label" aria-hidden="true">
        Aperçu
      </span>
      {LOBBY_THEMES.map((theme) => {
        const active = theme.id === value;
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => onChange(theme.id)}
            aria-pressed={active}
            data-active={active || undefined}
            className="lobby-switcher__pill"
          >
            {theme.label}
          </button>
        );
      })}
    </div>
  );
}
