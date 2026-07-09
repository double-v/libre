import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSiteThemeApply } from '@/hooks/useSiteThemeApply';
import { SITE_THEMES } from '@/lib/site-themes';

const libre = SITE_THEMES.find((t) => t.id === 'libre')!;
const warm = SITE_THEMES.find((t) => t.id === 'libre-warm')!;

describe('useSiteThemeApply', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('style');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('style');
  });

  it('sets data-theme to the theme id on mount', () => {
    renderHook(() => useSiteThemeApply(libre));
    expect(document.documentElement.getAttribute('data-theme')).toBe('libre');
  });

  it('updates data-theme when the theme prop changes', () => {
    const { rerender } = renderHook(
      ({ theme }: { theme: typeof libre }) => useSiteThemeApply(theme),
      { initialProps: { theme: libre } },
    );
    expect(document.documentElement.getAttribute('data-theme')).toBe('libre');

    rerender({ theme: warm });
    expect(document.documentElement.getAttribute('data-theme')).toBe('libre-warm');
  });

  it('removes data-theme on unmount', () => {
    const { unmount } = renderHook(() => useSiteThemeApply(warm));
    expect(document.documentElement.getAttribute('data-theme')).toBe('libre-warm');
    unmount();
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
  });

  it('applies no inline style — skin values live in CSS blocks', () => {
    // Mode-aware skins are pure CSS (html[data-theme="…"] / .dark). The hook
    // only toggles the attribute, so it must never write inline custom props.
    renderHook(() => useSiteThemeApply(warm));
    expect(document.documentElement.getAttribute('style')).toBeNull();
  });
});
