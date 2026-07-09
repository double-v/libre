import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { getSiteTheme, isValidSiteTheme } from '@/lib/site-themes';

/**
 * Skin de l'utilisateur connecté — persistance cross-appareils (cf. #224).
 * Le choix local (localStorage) reste prioritaire pour l'affichage no-flash ;
 * cette route synchronise le compte pour les autres appareils.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await getDb().user.findUnique({
      where: { id: session.user.id },
      select: { skin: true },
    });
    return NextResponse.json({ skin: user?.skin ?? null }, { status: 200 });
  } catch (error) {
    console.error('User skin GET error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json().catch(() => null);
    const raw = body?.skin;
    if (!isValidSiteTheme(raw)) {
      return NextResponse.json({ error: 'Thème inconnu' }, { status: 400 });
    }
    // Normalise vers l'id canonique (résout les alias legacy default/c-warm).
    const skin = getSiteTheme(raw)!.id;
    await getDb().user.update({
      where: { id: session.user.id },
      data: { skin },
    });
    return NextResponse.json({ skin }, { status: 200 });
  } catch (error) {
    console.error('User skin PUT error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, veuillez réessayer' },
      { status: 500 },
    );
  }
}
