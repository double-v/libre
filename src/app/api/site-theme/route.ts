import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSiteTheme, DEFAULT_SITE_THEME_ID } from '@/lib/site-themes';

const SINGLETON_ID = 'singleton';

// No caching — the admin should always see the current value immediately.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getDb().siteConfig.findUnique({
      where: { id: SINGLETON_ID },
    });
    const themeId = config?.currentTheme ?? DEFAULT_SITE_THEME_ID;
    // Validate the stored value is still a known theme (defensive)
    const theme = getSiteTheme(themeId) ?? getSiteTheme(DEFAULT_SITE_THEME_ID)!;
    return NextResponse.json({ id: theme.id }, { status: 200 });
  } catch (error) {
    console.error('Public site-theme GET error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 }
    );
  }
}
