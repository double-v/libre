import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { FEATURES, configDepuisFeatures, type Features } from '@/lib/features';
import { getFeatures, invaliderFeatures } from '@/lib/features-server';

const SINGLETON_ID = 'singleton';

/** Interrupteurs de fonctionnalités (#418) — lecture admin. */
export async function GET() {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  return NextResponse.json(await getFeatures(), { status: 200 });
}

/**
 * Écriture : le corps porte un booléen par fonctionnalité, on stocke les
 * écarts aux défauts — coupées d'un côté, allumées de l'autre (spec 007, R4). Journalisé dans `ModerationLog` (cible = l'admin lui-même : il
 * n'y a pas d'autre sujet), et cache serveur invalidé pour que l'API réponde
 * juste dès la requête suivante.
 */
export async function PUT(request: NextRequest) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;

  try {
    const body = (await request.json()) as Partial<Record<string, unknown>>;
    const valide = FEATURES.every((f) => typeof body?.[f] === 'boolean');
    if (!valide) {
      return NextResponse.json(
        { error: 'Validation failed', details: { features: [`Attendu : ${FEATURES.join(', ')} en booléens`] } },
        { status: 400 },
      );
    }
    const features = Object.fromEntries(FEATURES.map((f) => [f, body[f] as boolean])) as Features;
    const { featuresDisabled, featuresEnabled } = configDepuisFeatures(features);

    const db = getDb();
    await db.siteConfig.upsert({
      where: { id: SINGLETON_ID },
      update: { featuresDisabled, featuresEnabled, updatedBy: adminResult.userId },
      create: { id: SINGLETON_ID, featuresDisabled, featuresEnabled, updatedBy: adminResult.userId },
    });
    const ecarts = [
      featuresDisabled.length ? `coupees: ${featuresDisabled.join(', ')}` : '',
      featuresEnabled.length ? `allumees: ${featuresEnabled.join(', ')}` : '',
    ].filter(Boolean);
    await db.moderationLog.create({
      data: {
        adminId: adminResult.userId,
        targetUserId: adminResult.userId,
        action: 'SET_FEATURES',
        reason: ecarts.length ? ecarts.join(' ; ') : 'defauts',
      },
    });
    invaliderFeatures();

    return NextResponse.json(features, { status: 200 });
  } catch (error) {
    console.error('features.write.failed', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Une erreur est survenue, veuillez réessayer' }, { status: 500 });
  }
}
