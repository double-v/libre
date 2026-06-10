'use client';

import { useEffect } from 'react';
import type { SiteTheme } from '@/lib/site-themes';

/**
 * Apply a SiteTheme to the document root.
 *
 * On mount and whenever `theme` changes, sets:
 *   - <html data-theme="...">
 *   - inline CSS custom properties from theme.tokenOverrides
 *
 * On unmount, removes both the data-theme attribute and the inline style,
 * so the page falls back to whatever the next render / navigation provides.
 *
 * SSR-safe: if `document` is unavailable, the effect short-circuits.
 */
export function useSiteThemeApply(theme: SiteTheme): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', theme.id);
    for (const [key, value] of Object.entries(theme.tokenOverrides)) {
      root.style.setProperty(key, value);
    }
    return () => {
      root.removeAttribute('data-theme');
      // Remove only the keys we set, in case other code touches the style.
      for (const key of Object.keys(theme.tokenOverrides)) {
        root.style.removeProperty(key);
      }
    };
  }, [theme]);
}
