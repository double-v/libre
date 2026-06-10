import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { isValidSiteTheme } from '@/lib/site-themes';

const SINGLETON_ID = 'singleton';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
        updatedBy: session.user.id,
      },
      create: {
        id: SINGLETON_ID,
        currentTheme: themeId,
        updatedBy: session.user.id,
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
