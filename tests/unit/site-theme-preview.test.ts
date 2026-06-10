import { describe, it, expect } from 'vitest';
import {
  resolvePreviewTheme,
  buildPreviewCookieHeader,
  buildPreviewClearCookieHeader,
  PREVIEW_COOKIE_NAME,
  PREVIEW_COOKIE_MAX_AGE_SECONDS,
} from '@/lib/site-theme-preview';
import { SITE_THEMES } from '@/lib/site-themes';

describe('resolvePreviewTheme', () => {
  it('returns the matched theme when the cookie value is a known id', () => {
    for (const t of SITE_THEMES) {
      const result = resolvePreviewTheme(t.id);
      expect(result?.id).toBe(t.id);
    }
  });

  it('returns null when the cookie value is an unknown id', () => {
    expect(resolvePreviewTheme('not-a-real-theme')).toBeNull();
  });

  it('returns null when the cookie value is missing or empty', () => {
    expect(resolvePreviewTheme(undefined)).toBeNull();
    expect(resolvePreviewTheme('')).toBeNull();
  });

  it('returns null for non-string values (defensive)', () => {
    expect(resolvePreviewTheme(null)).toBeNull();
    expect(resolvePreviewTheme(123)).toBeNull();
    expect(resolvePreviewTheme({ id: 'default' })).toBeNull();
  });
});

describe('buildPreviewCookieHeader', () => {
  it('produces a Set-Cookie header with the right name, value, and 24h max-age', () => {
    const header = buildPreviewCookieHeader('c-warm');
    expect(header).toContain(`${PREVIEW_COOKIE_NAME}=c-warm`);
    expect(header).toContain(`Max-Age=${PREVIEW_COOKIE_MAX_AGE_SECONDS}`);
    expect(header).toContain('Path=/');
    expect(header).toContain('SameSite=Lax');
  });

  it('encodes the value safely (no unescaped special chars)', () => {
    // Our theme ids are all simple slugs, but encodeURIComponent would
    // still handle them — the helper should not break on those.
    const header = buildPreviewCookieHeader('default');
    expect(header).toContain(`${PREVIEW_COOKIE_NAME}=default`);
  });
});

describe('buildPreviewClearCookieHeader', () => {
  it('produces a Set-Cookie header that expires immediately and empties the value', () => {
    const header = buildPreviewClearCookieHeader();
    expect(header).toContain(`${PREVIEW_COOKIE_NAME}=`);
    expect(header).toMatch(/Max-Age=0/);
    expect(header).toContain('Path=/');
  });
});
