import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { isValidSiteTheme } from '@/lib/site-themes';

const SINGLETON_ID = 'singleton';

export async function GET() {
  // Use the shared requireAdmin() helper so the DB role is re-checked on
  // every call (JWT may be stale after a role change). Returns 404 to hide
  // the route's existence from non-admins, consistent with all other
  // /api/admin/* routes. Previously this used an inline JWT-only check
  // (session.user.role !== 'ADMIN') which trusts the cached JWT and
  // returns 403 — weaker than the rest of the admin surface (#155).
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  try {
    const config = await getDb().siteConfig.findUnique({
      where: { id: SINGLETON_ID },
    });

    if (!config) {
      // Should never happen — the migration seeds the singleton row
      return NextResponse.json({ currentTheme: 'default' }, { status: 200 });
    }

    return NextResponse.json({ currentTheme: config.currentTheme }, { status: 200 });
  } catch (error) {
    console.error('SiteConfig GET error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  try {
    const body = await request.json();
    const themeId = body?.currentTheme;

    if (!isValidSiteTheme(themeId)) {
      return NextResponse.json(
        { error: 'Invalid theme id', details: { currentTheme: ['Must be one of: default, c-warm'] } },
        { status: 400 }
      );
    }

    const config = await getDb().siteConfig.upsert({
      where: { id: SINGLETON_ID },
      update: {
        currentTheme: themeId,
        updatedBy: adminResult.userId,
      },
      create: {
        id: SINGLETON_ID,
        currentTheme: themeId,
        updatedBy: adminResult.userId,
      },
    });

    return NextResponse.json({ currentTheme: config.currentTheme }, { status: 200 });
  } catch (error) {
    console.error('SiteConfig PUT error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 }
    );
  }
}
