import { cookies } from 'next/headers';
import { getSiteTheme, type SiteTheme } from '@/lib/site-themes';

/**
 * Cookie name used to override the active site theme for the current
 * visitor. Set by the admin via the ?preview=... query param on any URL.
 */
export const PREVIEW_COOKIE_NAME = 'libre-preview-theme';

/** 24h — long enough to compare themes across sessions, short enough to be safe. */
export const PREVIEW_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24;

/**
 * Resolve a cookie value (or any string-shaped input) to a known SiteTheme.
 * Returns null if the value is missing, malformed, or doesn't match a
 * registered theme id.
 */
export function resolvePreviewTheme(value: unknown): SiteTheme | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  return getSiteTheme(value) ?? null;
}

/**
 * Read the active preview theme from the incoming request cookies.
 * Returns null if no preview is in effect.
 *
 * This is the only function the server-side render path should call.
 * It is async because Next 15's `cookies()` returns a Promise.
 */
export async function readPreviewThemeFromCookies(): Promise<SiteTheme | null> {
  const store = await cookies();
  const value = store.get(PREVIEW_COOKIE_NAME)?.value;
  return resolvePreviewTheme(value);
}

/**
 * Build the Set-Cookie header value that activates a preview.
 */
export function buildPreviewCookieHeader(themeId: string): string {
  const value = encodeURIComponent(themeId);
  return [
    `${PREVIEW_COOKIE_NAME}=${value}`,
    `Max-Age=${PREVIEW_COOKIE_MAX_AGE_SECONDS}`,
    'Path=/',
    'SameSite=Lax',
  ].join('; ');
}

/**
 * Build the Set-Cookie header value that clears any active preview.
 */
export function buildPreviewClearCookieHeader(): string {
  return [
    `${PREVIEW_COOKIE_NAME}=`,
    'Max-Age=0',
    'Path=/',
    'SameSite=Lax',
  ].join('; ');
}
