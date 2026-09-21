import { NextResponse, after } from 'next/server';
import { getFeatures } from '@/lib/features-server';
import { ensureRetentionFresh } from '@/lib/retention/purge';

export const dynamic = 'force-dynamic';

/**
 * État des interrupteurs de fonctionnalités (#418), pour l'app.
 * Public et sans cache HTTP : une fonctionnalité coupée doit disparaître de la
 * nav au rechargement suivant, pas à l'expiration d'un cache navigateur.
 */
export async function GET() {
  // Purge de rétention paresseuse (#427) : cette route est appelée à chaque
  // page de l'app, c'est le battement de cœur le plus fiable qu'on ait. Après
  // la réponse, jamais dans son chemin ; un jour déjà traité coûte zéro requête.
  after(() => ensureRetentionFresh().catch(() => {}));
  return NextResponse.json(await getFeatures(), {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}
