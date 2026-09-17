/**
 * Badge sur l'icône de l'app installée (API Badging, #389/#390).
 *
 * Toujours SANS nombre (décision Q4, spec 003) : la charte interdit tout
 * compteur côté membre, et `setAppBadge()` sans argument pose un badge générique
 * (point sur Android, rendu minimal sur iOS — accepté). L'API n'existe que sur
 * une PWA installée et peut rejeter ailleurs : ces helpers n'échouent jamais.
 */

type NavigatorWithBadge = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

export async function setBadge(): Promise<void> {
  if (typeof navigator === 'undefined') return;
  const nav = navigator as NavigatorWithBadge;
  if (typeof nav.setAppBadge !== 'function') return;
  try {
    await nav.setAppBadge();
  } catch {
    // PWA non installée, permission absente : sans conséquence.
  }
}

export async function clearBadge(): Promise<void> {
  if (typeof navigator === 'undefined') return;
  const nav = navigator as NavigatorWithBadge;
  if (typeof nav.clearAppBadge !== 'function') return;
  try {
    await nav.clearAppBadge();
  } catch {
    // idem
  }
}
