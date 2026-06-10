import { describe, expect, it } from 'vitest';
import { SITE_THEMES, getSiteTheme, isValidSiteTheme } from '@/lib/site-themes';

describe('site-themes registry', () => {
  it('exports at least 2 themes', () => {
    expect(SITE_THEMES.length).toBeGreaterThanOrEqual(2);
  });

  it('every theme has a unique id', () => {
    const ids = SITE_THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every theme has a label, description, and tokenOverrides', () => {
    for (const t of SITE_THEMES) {
      expect(t.id).toBeTruthy();
      expect(t.label).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(typeof t.tokenOverrides).toBe('object');
    }
  });

  it('default theme is the first one and id is "default"', () => {
    expect(SITE_THEMES[0].id).toBe('default');
  });
});

describe('getSiteTheme', () => {
  it('returns the matching theme by id', () => {
    const t = getSiteTheme('default');
    expect(t).toBeDefined();
    expect(t?.id).toBe('default');
  });

  it('returns undefined for an unknown id', () => {
    expect(getSiteTheme('not-a-theme')).toBeUndefined();
  });
});

describe('isValidSiteTheme', () => {
  it('returns true for known theme ids', () => {
    expect(isValidSiteTheme('default')).toBe(true);
  });

  it('returns false for unknown theme ids', () => {
    expect(isValidSiteTheme('garbage')).toBe(false);
    expect(isValidSiteTheme(null)).toBe(false);
    expect(isValidSiteTheme(undefined)).toBe(false);
    expect(isValidSiteTheme(42)).toBe(false);
  });
});
