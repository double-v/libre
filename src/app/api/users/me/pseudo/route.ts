import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { rateLimit, limits } from '@/lib/rate-limit';
import { pseudoSchema } from '@/lib/validators';
import { normalizePseudo, validatePseudo } from '@/lib/pseudo';
import { enregistrerSignal } from '@/lib/fraude/signaux';

const bodySchema = z.object({ displayName: pseudoSchema });

/**
 * Changer son pseudo (#459) — depuis Paramètres, ou depuis l'écran `/pseudo`
 * quand la migration a retiré un pseudo hors règle. Même règle qu'à
 * l'inscription ; un renommage valide lève `mustRenameDisplayName`. Seul le
 * pseudo est écrit : le reste du corps est ignoré.
 */
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const rl = await rateLimit(`pseudo:${session.user.id}`, limits.pseudo.limit, limits.pseudo.windowMs);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Trop de changements de pseudo. Réessaie dans un moment.' },
        { status: 429 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      // Un contact dans le pseudo est déjà refusé par la règle (#459) ; il
      // devient aussi un indice pour la modération (spec 006, #443).
      const brut = typeof body?.displayName === 'string' ? body.displayName : '';
      const verdict = validatePseudo(brut);
      if (!verdict.ok && verdict.motif === 'contact') {
        await enregistrerSignal({ userId: session.user.id, type: 'contact_pseudo', force: 'fort', extrait: normalizePseudo(brut) });
      }
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Pseudo invalide' },
        { status: 400 },
      );
    }

    const user = await getDb().user.update({
      where: { id: session.user.id },
      data: { displayName: parsed.data.displayName, mustRenameDisplayName: false },
      select: { displayName: true },
    });

    return NextResponse.json({ displayName: user.displayName });
  } catch (error) {
    console.error('Pseudo update error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue, réessaie' },
      { status: 500 },
    );
  }
}
