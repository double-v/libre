import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  aConsentementSensible,
  donnerConsentementSensible,
  retirerConsentementSensible,
  traceConsentement,
} from '@/lib/consentement-sensible';

/**
 * Consentement art. 9 (#425) — état, don, retrait.
 *
 * Le retrait est un droit à tout moment (art. 7.3) : il efface d'un seul
 * tenant l'orientation, l'identité de genre, les pratiques et les préférences
 * qui les révèlent. Le compte reste ; seule la recherche par affinité s'arrête.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ sensitiveData: await aConsentementSensible(session.user.id) });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await donnerConsentementSensible(session.user.id, traceConsentement(request));
  return NextResponse.json({ sensitiveData: true });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await retirerConsentementSensible(session.user.id);
  return NextResponse.json({ sensitiveData: false });
}
