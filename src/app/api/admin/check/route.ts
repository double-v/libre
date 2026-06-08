import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';

/**
 * API endpoint pour vérifier si l'utilisateur courant est admin.
 * Appelée depuis le layout admin côté serveur car getServerSession
 * n'est pas fiable dans les Server Components du App Router.
 * Les cookies sont passés manuellement via next/headers.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ isAdmin: false, reason: 'no-session' }, { status: 200 });
    }

    const dbUser = await getDb().user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    const isAdmin = dbUser?.role?.toUpperCase() === 'ADMIN';

    return NextResponse.json({
      isAdmin,
      userId: session.user.id,
      dbRole: dbUser?.role ?? null,
      jwtRole: session.user.role ?? null,
    }, { status: 200 });
  } catch (error) {
    console.error('[api/admin/check] error:', error);
    return NextResponse.json({ isAdmin: false, reason: 'error' }, { status: 200 });
  }
}
