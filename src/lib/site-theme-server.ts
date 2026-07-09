import { getDb } from '@/lib/db';
import { getSiteTheme, DEFAULT_SITE_THEME_ID } from '@/lib/site-themes';
import { readPreviewThemeFromCookies } from '@/lib/site-theme-preview';

const SINGLETON_ID = 'singleton';

export interface SiteThemeInfo {
  id: string;
}

/**
 * Server-side: read the current site theme.
 *
 * Resolution order:
 *   1. Preview cookie (set via ?preview=... on any URL, 24h)
 *   2. The persisted currentTheme in site_config (the actual admin choice)
 *   3. 'default' theme (safe fallback)
 *
 * If anything throws (DB down, malformed row), we still resolve to the
 * 'default' theme rather than letting a theme lookup break the page render.
 */
export async function getCurrentSiteTheme(): Promise<SiteThemeInfo> {
  const fallback = (): SiteThemeInfo => {
    const t = getSiteTheme(DEFAULT_SITE_THEME_ID)!;
    return { id: t.id };
  };

  try {
    const preview = await readPreviewThemeFromCookies();
    if (preview) {
      return { id: preview.id };
    }

    const config = await getDb().siteConfig.findUnique({
      where: { id: SINGLETON_ID },
    });
    const themeId = config?.currentTheme ?? DEFAULT_SITE_THEME_ID;
    const theme = getSiteTheme(themeId) ?? getSiteTheme(DEFAULT_SITE_THEME_ID)!;
    return { id: theme.id };
  } catch (error) {
    console.error('getCurrentSiteTheme error:', error);
    return fallback();
  }
}
