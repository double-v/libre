import { getDb } from '@/lib/db';
import { getSiteTheme } from '@/lib/site-themes';

const SINGLETON_ID = 'singleton';

export interface SiteThemeInfo {
  id: string;
  tokenOverrides: Record<string, string>;
}

/**
 * Server-side: read the current site theme from the DB.
 * Returns the 'default' theme as a safe fallback if the row is missing
 * or contains an unknown value.
 */
export async function getCurrentSiteTheme(): Promise<SiteThemeInfo> {
  try {
    const config = await getDb().siteConfig.findUnique({
      where: { id: SINGLETON_ID },
    });
    const themeId = config?.currentTheme ?? 'default';
    const theme = getSiteTheme(themeId) ?? getSiteTheme('default')!;
    return { id: theme.id, tokenOverrides: theme.tokenOverrides };
  } catch (error) {
    // Don't let a theme lookup break the page render
    console.error('getCurrentSiteTheme error:', error);
    const fallback = getSiteTheme('default')!;
    return { id: fallback.id, tokenOverrides: fallback.tokenOverrides };
  }
}
