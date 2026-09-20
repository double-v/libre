import { NextResponse } from 'next/server';
import { getFeatures } from '@/lib/features-server';

export const dynamic = 'force-dynamic';

/**
 * État des interrupteurs de fonctionnalités (#418), pour l'app.
 * Public et sans cache HTTP : une fonctionnalité coupée doit disparaître de la
 * nav au rechargement suivant, pas à l'expiration d'un cache navigateur.
 */
export async function GET() {
  return NextResponse.json(await getFeatures(), {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}
