import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { isSquareEnabled } from '@/lib/square/config';

// La Place n'apparaît dans la navigation que si :
//  1. elle est activée globalement par l'admin (siteConfig.squareEnabled), et
//  2. au moins 2 personnes sont en ligne (toi + au moins une autre) — sinon
//     l'espace est vide et on ne l'affiche pas.
// Seuil « en ligne » aligné sur isOnline() (lib/time.ts) : 15 minutes.
const ONLINE_THRESHOLD_MS = 15 * 60 * 1000;
const MIN_ONLINE_TO_SHOW = 2;

// Pas de cache : la présence change en continu, et le flag admin doit
// prendre effet immédiatement.
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ visible: false }, { status: 200 });
  }

  const enabled = await isSquareEnabled();

  if (!enabled) {
    return NextResponse.json({ visible: false, enabled: false }, { status: 200 });
  }

  let onlineCount = 0;
  try {
    onlineCount = await getDb().user.count({
      where: {
        isBanned: false,
        lastActive: { gte: new Date(Date.now() - ONLINE_THRESHOLD_MS) },
      },
    });
  } catch {
    onlineCount = 0;
  }

  return NextResponse.json(
    { visible: onlineCount >= MIN_ONLINE_TO_SHOW, enabled, onlineCount },
    { status: 200 },
  );
}
