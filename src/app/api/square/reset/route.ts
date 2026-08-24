import { NextRequest, NextResponse } from 'next/server';
import { ensureSquareFresh } from '@/lib/square/reset';

/**
 * Reset de La Place déclenché par le cron Vercel.
 *
 * Ce chemin n'a longtemps rien fait : aucun `CRON_SECRET` n'existait en prod,
 * donc la garde ci-dessous répondait 401 à chaque passage, en silence (#13).
 * Le secret a été posé le 2026-08-24 — il redevient donc une vraie ceinture,
 * utile les jours sans visite, mais il n'est plus la seule courroie.
 *
 * Il passe par `ensureSquareFresh()` et **non** par la purge directe : les deux
 * chemins doivent se partager le même témoin, sinon le cron purge à 2h sans le
 * poser, et le premier visiteur de la journée repurge derrière lui — effaçant
 * au passage le message d'accueil que le cron venait d'écrire. Celui des deux
 * qui arrive le premier fait le travail ; l'autre repart sans rien casser.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const outcome = await ensureSquareFresh();

  return NextResponse.json({
    success: true,
    // `false` n'est pas un échec : c'est que le trafic avait déjà tourné la page.
    reset: outcome.reset,
    deletedMessages: outcome.deletedMessages,
    deletedReactions: outcome.deletedReactions,
  });
}
