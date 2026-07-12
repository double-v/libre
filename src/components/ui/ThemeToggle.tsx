'use client';

import { useThemePreference, type Mode } from '@/hooks/useThemePreference';

/**
 * ThemeToggle — bascule d'apparence compacte (axe **Mode** uniquement), composant DS.
 *
 * Un seul `icon-button` dans le `TopNav` : **cycle** Clair → Sombre → Auto (système)
 * en un clic, sans popover. Le **choix du thème** (skin) ne vit pas ici mais dans
 * les Paramètres (`AppearanceSettings`) et sur la landing (`ThemeMenu` complet).
 * Source de vérité unique : `useThemePreference`.
 *
 * A11y : `aria-label` dynamique (mode courant + action au clic) ; cible ≥ 44px ;
 * focus ring coral ; icône décorative (`aria-hidden`). Pas d'animation propre — le
 * swap d'icône est instantané, la `transition-colors` est clampée par le bloc global
 * `prefers-reduced-motion` de globals.css. Cf. DESIGN.md § ThemeToggle.
 */

// Ordre du cycle + libellé FR par mode (pour l'annonce a11y).
const CYCLE: Mode[] = ['light', 'dark', 'auto'];
const LABEL: Record<Mode, string> = {
  light: 'Clair',
  dark: 'Sombre',
  auto: 'Auto (système)',
};

function nextMode(mode: Mode): Mode {
  return CYCLE[(CYCLE.indexOf(mode) + 1) % CYCLE.length];
}

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { ready, mode, setMode } = useThemePreference();
  // Avant hydratation l'état réel n'est pas connu (SSR = défaut 'auto') : on rend
  // l'icône 'auto' neutre, l'effet du hook aligne au premier paint (cf. #193).
  const current: Mode = ready ? mode : 'auto';
  const next = nextMode(current);

  return (
    <button
      type="button"
      onClick={() => setMode(next)}
      aria-label={`Apparence : ${LABEL[current]}. Cliquer pour passer en ${LABEL[next]}.`}
      title={`Apparence : ${LABEL[current]}`}
      className={`inline-flex min-h-[44px] items-center rounded-control p-2 text-muted transition-colors hover:bg-fill-subtle hover:text-content focus-visible:outline-none focus-visible:shadow-focus ${className}`.trim()}
    >
      <ModeIcon mode={current} />
    </button>
  );
}

/** Icône du mode courant : soleil (clair), lune (sombre), écran (auto/système). */
function ModeIcon({ mode }: { mode: Mode }) {
  if (mode === 'light') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    );
  }
  if (mode === 'dark') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    );
  }
  // auto (système) — écran/moniteur
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}
