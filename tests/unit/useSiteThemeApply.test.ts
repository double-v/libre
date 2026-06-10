import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSiteThemeApply } from '@/hooks/useSiteThemeApply';
import { SITE_THEMES } from '@/lib/site-themes';

const defaultTheme = SITE_THEMES.find((t) => t.id === 'default')!;
const warmTheme = SITE_THEMES.find((t) => t.id === 'c-warm')!;

describe('useSiteThemeApply', () => {
  beforeEach(() => {
    // Reset the DOM between tests so we can assert the exact end state.
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('style');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('style');
  });

  it('sets data-theme to the theme id on mount', () => {
    renderHook(() => useSiteThemeApply(defaultTheme));
    expect(document.documentElement.getAttribute('data-theme')).toBe('default');
  });

  it('applies each token override as a CSS custom property on <html>', () => {
    renderHook(() => useSiteThemeApply(warmTheme));
    const style = document.documentElement.style;
    for (const [key, value] of Object.entries(warmTheme.tokenOverrides)) {
      // jsdom normalises names like --color-coral to --color-coral (kept as-is)
      // but we check via getPropertyValue for portability.
      expect(style.getPropertyValue(key)).toBe(value);
    }
  });

  it('updates the DOM when the theme prop changes', () => {
    const { rerender } = renderHook(
      ({ theme }: { theme: typeof defaultTheme }) => useSiteThemeApply(theme),
      { initialProps: { theme: defaultTheme } },
    );
    expect(document.documentElement.getAttribute('data-theme')).toBe('default');

    rerender({ theme: warmTheme });
    expect(document.documentElement.getAttribute('data-theme')).toBe('c-warm');
    for (const [key, value] of Object.entries(warmTheme.tokenOverrides)) {
      expect(document.documentElement.style.getPropertyValue(key)).toBe(value);
    }
  });

  it('removes the inline style and data-theme on unmount', () => {
    const { unmount } = renderHook(() => useSiteThemeApply(warmTheme));
    expect(document.documentElement.getAttribute('data-theme')).toBe('c-warm');
    unmount();
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    // jsdom collapses style to an empty string once all props are removed
    expect(document.documentElement.getAttribute('style')).toBe('');
  });

  it('does not throw when called with an empty token override map', () => {
    // Defensive: a SiteTheme with no overrides should still set data-theme.
    const empty: typeof defaultTheme = { ...defaultTheme, tokenOverrides: {} };
    expect(() => renderHook(() => useSiteThemeApply(empty))).not.toThrow();
    expect(document.documentElement.getAttribute('data-theme')).toBe('default');
  });
});
