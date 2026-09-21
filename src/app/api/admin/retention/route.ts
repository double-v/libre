import { NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { REGLES_RETENTION } from '@/lib/retention/regles';
import { enregistrerBilan, purgerRetention } from '@/lib/retention/purge';

/** Au-delà, l'admin est alerté : la purge par le trafic n'a pas tourné. */
export const RETARD_ALERTE_MS = 48 * 60 * 60 * 1000;

/**
 * Purge de rétention (#427) — état et lancement manuel.
 *
 * La purge se déclenche par le trafic ; sans visite, rien ne bouge. Cette
 * route dit quand elle a tourné pour la dernière fois, avec quel bilan, et
 * permet de la lancer à la main. Journalisé dans `ModerationLog` (cible =
 * l'admin lui-même, comme SET_FEATURES).
 */
export async function GET() {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  return NextResponse.json(await etat(), { status: 200 });
}

export async function POST() {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  try {
    const now = new Date();
    const bilan = await purgerRetention(now);
    await enregistrerBilan(bilan, now);
    await getDb().retentionState.update({ where: { id: 'singleton' }, data: { lastRunAt: now } });
    const enEchec = Object.entries(bilan).filter(([, v]) => typeof v === 'object').map(([k]) => k);
    await getDb().moderationLog.create({
      data: {
        adminId: adminResult.userId,
        targetUserId: adminResult.userId,
        action: 'RUN_RETENTION',
        reason: enEchec.length ? `manuel ; en echec: ${enEchec.join(', ')}` : 'manuel',
      },
    });
    return NextResponse.json(await etat(), { status: 200 });
  } catch (error) {
    console.error('retention.run.failed', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Une erreur est survenue, veuillez réessayer' }, { status: 500 });
  }
}

async function etat() {
  const temoin = await getDb().retentionState.findUnique({ where: { id: 'singleton' } });
  const lastRunAt = temoin?.lastRunAt ?? null;
  const lastReport = (temoin?.lastReport ?? null) as Record<string, number | { erreur: string }> | null;
  // Une règle en échec compte comme un retard : la journée a été réclamée
  // (lastRunAt avancé) mais la promesse n'est pas tenue.
  const enEchec = lastReport !== null && Object.values(lastReport).some((v) => typeof v === 'object');
  return {
    lastRunAt,
    lastReport,
    enRetard: lastRunAt === null || Date.now() - lastRunAt.getTime() > RETARD_ALERTE_MS || enEchec,
    regles: REGLES_RETENTION.map(({ id, donnees, duree }) => ({ id, donnees, duree })),
  };
}
