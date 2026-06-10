import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSiteTheme } from '@/lib/site-themes';

const SINGLETON_ID = 'singleton';

// No caching — the admin should always see the current value immediately.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getDb().siteConfig.findUnique({
      where: { id: SINGLETON_ID },
    });
    const themeId = config?.currentTheme ?? 'default';
    // Validate the stored value is still a known theme (defensive)
    const theme = getSiteTheme(themeId) ?? getSiteTheme('default')!;
    return NextResponse.json(
      { id: theme.id, tokenOverrides: theme.tokenOverrides },
      { status: 200 }
    );
  } catch (error) {
    console.error('Public site-theme GET error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 }
    );
  }
}
