'use client';

import { useEffect } from 'react';
import type { SiteTheme } from '@/lib/site-themes';

/**
 * Applique un skin au document en posant `<html data-theme="…">`.
 *
 * Les valeurs du skin vivent en CSS (blocs `html[data-theme="…"]` clair /
 * `html[data-theme="…"].dark` sombre, dans globals.css) : il suffit de poser
 * l'attribut, et le mode clair/sombre (classe `.dark`) sélectionne le bon
 * bloc. Plus aucun style inline — l'ancienne approche écrasait le dark mode.
 *
 * Au démontage, retire l'attribut pour revenir au skin fourni par le rendu
 * suivant / la navigation. SSR-safe : court-circuite si `document` absent.
 */
export function useSiteThemeApply(theme: SiteTheme): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', theme.id);
    return () => {
      root.removeAttribute('data-theme');
    };
  }, [theme]);
}
