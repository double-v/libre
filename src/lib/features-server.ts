import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { featuresDepuisConfig, DEFAUTS, type Feature, type Features } from '@/lib/features';

const SINGLETON_ID = 'singleton';

/**
 * Lecture serveur des interrupteurs (#418), avec un cache court : chaque route
 * de La Place ou des croisements passe ici, et un `findUnique` par requête
 * serait la seule charge nouvelle de la fonctionnalité. 15 s de retard sur un
 * geste admin est acceptable pour un coupe-feu — et `invaliderFeatures()`
 * remet le compteur à zéro dans le même processus après une écriture.
 */
const TTL_MS = 15_000;
let cache: { features: Features; expire: number } | null = null;

export function invaliderFeatures(): void {
  cache = null;
}

export async function getFeatures(): Promise<Features> {
  const maintenant = Date.now();
  if (cache && cache.expire > maintenant) return cache.features;
  try {
    const config = await getDb().siteConfig.findUnique({
      where: { id: SINGLETON_ID },
      select: { featuresDisabled: true, featuresEnabled: true },
    });
    const features = featuresDepuisConfig(config?.featuresDisabled, config?.featuresEnabled);
    cache = { features, expire: maintenant + TTL_MS };
    return features;
  } catch (error) {
    // Panne de lecture : retour aux défauts. On ne coupe rien par accident (le
    // coupe-feu exige un geste explicite) et on n'allume rien non plus.
    console.error('features.read.failed', error instanceof Error ? error.message : 'unknown');
    return DEFAUTS;
  }
}

export async function featureActive(feature: Feature): Promise<boolean> {
  return (await getFeatures())[feature];
}

/**
 * Garde de route API : `null` si la fonctionnalité est active, sinon la
 * réponse à renvoyer telle quelle. Deux lignes par route :
 *   const refus = await gardeFeature('square'); if (refus) return refus;
 */
export async function gardeFeature(feature: Feature): Promise<NextResponse | null> {
  if (await featureActive(feature)) return null;
  return NextResponse.json({ error: 'feature_disabled', feature }, { status: 403 });
}
