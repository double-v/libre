import { describe, expect, it } from 'vitest';
import {
  SITE_THEMES,
  getSiteTheme,
  isValidSiteTheme,
  DEFAULT_SITE_THEME_ID,
} from '@/lib/site-themes';

describe('site-themes registry', () => {
  it('exports at least 2 themes', () => {
    expect(SITE_THEMES.length).toBeGreaterThanOrEqual(2);
  });

  it('every theme has a unique id', () => {
    const ids = SITE_THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every theme has an id, label and description', () => {
    for (const t of SITE_THEMES) {
      expect(t.id).toBeTruthy();
      expect(t.label).toBeTruthy();
      expect(t.description).toBeTruthy();
    }
  });

  it('the default theme is "libre" and comes first', () => {
    expect(DEFAULT_SITE_THEME_ID).toBe('libre');
    expect(SITE_THEMES[0].id).toBe('libre');
  });
});

describe('getSiteTheme', () => {
  it('returns the matching theme by id', () => {
    expect(getSiteTheme('libre')?.id).toBe('libre');
    expect(getSiteTheme('libre-warm')?.id).toBe('libre-warm');
  });

  it('resolves legacy ids via aliases', () => {
    expect(getSiteTheme('default')?.id).toBe('libre');
    expect(getSiteTheme('c-warm')?.id).toBe('libre-warm');
  });

  it('returns undefined for an unknown id', () => {
    expect(getSiteTheme('not-a-theme')).toBeUndefined();
  });
});

describe('isValidSiteTheme', () => {
  it('returns true for known theme ids (including legacy aliases)', () => {
    expect(isValidSiteTheme('libre')).toBe(true);
    expect(isValidSiteTheme('libre-warm')).toBe(true);
    expect(isValidSiteTheme('default')).toBe(true);
    expect(isValidSiteTheme('c-warm')).toBe(true);
  });

  it('returns false for unknown theme ids', () => {
    expect(isValidSiteTheme('garbage')).toBe(false);
    expect(isValidSiteTheme(null)).toBe(false);
    expect(isValidSiteTheme(undefined)).toBe(false);
    expect(isValidSiteTheme(42)).toBe(false);
  });
});
