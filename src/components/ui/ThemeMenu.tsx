'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { SITE_THEMES } from '@/lib/site-themes';
import { useThemePreference, type Mode } from '@/hooks/useThemePreference';

const MODES: { id: Mode; label: string }[] = [
  { id: 'light', label: 'Clair' },
  { id: 'dark', label: 'Sombre' },
  { id: 'auto', label: 'Auto' },
];

/**
 * ThemeMenu — le point d'entrée UNIQUE du theming (mode × thème), composant DS.
 *
 * Un seul bouton dans le `TopNav`, présent partout. Ouvre un popover (desktop) /
 * bottom-sheet (mobile) : segment Mode (Clair/Sombre/Auto) + grille Thème (une
 * carte par `SITE_THEMES`, mini-aperçu re-skinné via `data-theme` local) +
 * invitation guest. Lit/écrit via `useThemePreference` (source de vérité unique).
 *
 * A11y : `aria-haspopup="dialog"` + `aria-expanded` ; panneau `role="dialog"`
 * `aria-modal` ; focus trap ; Esc + clic-dehors ferment ; focus rendu au bouton ;
 * cibles ≥ 44px. L'animation d'ouverture est clampée par le bloc global
 * `prefers-reduced-motion` de globals.css (80ms).
 * Cf. DESIGN.md § Component Library — ThemeMenu.
 */
export default function ThemeMenu({ className = '' }: { className?: string }) {
  const { ready, mode, theme, setMode, setTheme } = useThemePreference();
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const close = useCallback(() => setOpen(false), []);

  // Clic-dehors + Esc ferment. Focus rendu au déclencheur à la fermeture.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) close();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  // À l'ouverture : focus le premier contrôle. À la fermeture : rendre au bouton.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) {
      panelRef.current
        ?.querySelector<HTMLElement>('button, a, [tabindex]')
        ?.focus();
    } else if (wasOpen.current) {
      triggerRef.current?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  // Focus trap : Tab / Shift+Tab bouclent dans le panneau.
  function onPanelKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Tab') return;
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
      'button, a[href], [tabindex]:not([tabindex="-1"])',
    );
    if (!focusables || focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const current = SITE_THEMES.find((t) => t.id === theme) ?? SITE_THEMES[0];

  return (
    <div ref={rootRef} className={`relative ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label="Thème et apparence"
        className="inline-flex min-h-[44px] items-center gap-2 rounded-control border border-hairline bg-surface px-3 py-1.5 text-sm font-medium text-content transition-colors hover:border-coral-light focus-visible:outline-none focus-visible:shadow-focus"
      >
        <ThemeSwatch id={current.id} size="sm" />
        <span className="hidden sm:inline">{current.label}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="text-muted">
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <>
          {/* Voile mobile (bottom-sheet). Desktop : popover ancré, pas de voile. */}
          <div className="fixed inset-0 z-40 bg-black/30 sm:hidden" aria-hidden="true" />
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-label="Choisir le thème et l'apparence"
            onKeyDown={onPanelKeyDown}
            className="animate-fade-in fixed inset-x-0 bottom-0 z-50 rounded-t-card border border-hairline bg-surface p-4 pb-safe shadow-pop sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-[calc(100%+8px)] sm:w-80 sm:rounded-card sm:pb-4"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-hairline-strong sm:hidden" aria-hidden="true" />

            {/* Segment Mode */}
            <fieldset>
              <legend className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
                Apparence
              </legend>
              <div className="flex gap-1 rounded-control bg-fill-subtle p-1" role="group" aria-label="Mode clair, sombre ou automatique">
                {MODES.map((m) => {
                  const active = ready && mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMode(m.id)}
                      aria-pressed={active}
                      className={`min-h-[40px] flex-1 rounded-[calc(var(--rad-control)-2px)] px-2 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:shadow-focus ${
                        active
                          ? 'bg-surface text-coral shadow-soft'
                          : 'text-muted hover:text-content'
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Grille Thème */}
            <fieldset className="mt-4">
              <legend className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
                Thème
              </legend>
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="Choisir un thème">
                {SITE_THEMES.map((t) => {
                  const active = ready && theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id)}
                      aria-pressed={active}
                      title={t.description}
                      className={`flex min-h-[44px] items-center gap-2 rounded-control border p-2 text-left transition-colors focus-visible:outline-none focus-visible:shadow-focus ${
                        active
                          ? 'border-coral bg-blush'
                          : 'border-hairline hover:border-coral-light'
                      }`}
                    >
                      <ThemeSwatch id={t.id} size="md" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-content">
                          {t.label}
                        </span>
                      </span>
                      {active && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" className="shrink-0 text-coral">
                          <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Invitation guest — jamais bloquante (le choix marche en local). */}
            {status === 'unauthenticated' && (
              <p className="mt-4 border-t border-hairline pt-3 text-xs text-muted">
                <Link href="/register" className="font-medium text-coral hover:underline">
                  Crée un compte
                </Link>{' '}
                pour garder ton thème sur tous tes appareils, ou{' '}
                <Link href="/login" className="font-medium text-coral hover:underline">
                  connecte-toi
                </Link>
                .
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Mini-aperçu d'un thème : porte `data-theme` en local → résout la palette CLAIRE
 * du thème (surface + accent coral) indépendamment du thème racine. C'est le
 * garde-fou visuel de re-skin (cf. DESIGN.md § ThemeMenu).
 */
function ThemeSwatch({ id, size }: { id: string; size: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-5 w-5' : 'h-8 w-8';
  return (
    <span
      data-theme={id}
      aria-hidden="true"
      className={`${dim} relative shrink-0 overflow-hidden rounded-full border border-hairline bg-surface`}
    >
      <span className="absolute inset-y-0 right-0 w-1/2 bg-coral" />
    </span>
  );
}
