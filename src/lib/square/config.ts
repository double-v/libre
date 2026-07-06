import { getDb } from '@/lib/db';

/**
 * La Place est-elle activée globalement (interrupteur admin) ?
 * Tolérant : en cas d'erreur DB ou de colonne absente (avant application de
 * la migration), on considère La Place activée — dégradation gracieuse,
 * cohérente avec le reste des lectures de site_config.
 */
export async function isSquareEnabled(): Promise<boolean> {
  try {
    const config = await getDb().siteConfig.findUnique({
      where: { id: 'singleton' },
      select: { squareEnabled: true },
    });
    return config?.squareEnabled ?? true;
  } catch {
    return true;
  }
}
