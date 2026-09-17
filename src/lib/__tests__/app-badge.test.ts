/**
 * Tests — badge d'icône de l'app installée (API Badging, #389/#390).
 *
 * Décision Q4 de la spec 003 : badge SANS nombre sur toutes les plateformes.
 * L'API n'existe que sur PWA installée et ses promesses peuvent rejeter :
 * les deux helpers doivent être inoffensifs partout ailleurs.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { setBadge, clearBadge } from '../app-badge';

type NavWithBadge = Navigator & {
  setAppBadge?: (n?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

afterEach(() => {
  const nav = navigator as Partial<NavWithBadge>;
  delete nav.setAppBadge;
  delete nav.clearAppBadge;
});

describe('app-badge', () => {
  it('setBadge appelle setAppBadge sans argument (jamais un nombre)', async () => {
    const setAppBadge = vi.fn().mockResolvedValue(undefined);
    (navigator as NavWithBadge).setAppBadge = setAppBadge;
    await setBadge();
    expect(setAppBadge).toHaveBeenCalledTimes(1);
    expect(setAppBadge.mock.calls[0]).toHaveLength(0);
  });

  it('clearBadge appelle clearAppBadge', async () => {
    const clearAppBadge = vi.fn().mockResolvedValue(undefined);
    (navigator as NavWithBadge).clearAppBadge = clearAppBadge;
    await clearBadge();
    expect(clearAppBadge).toHaveBeenCalledTimes(1);
  });

  it("sans l'API : no-op, sans erreur", async () => {
    await expect(setBadge()).resolves.toBeUndefined();
    await expect(clearBadge()).resolves.toBeUndefined();
  });

  it('une promesse rejetée est avalée', async () => {
    (navigator as NavWithBadge).setAppBadge = vi.fn().mockRejectedValue(new Error('not installed'));
    (navigator as NavWithBadge).clearAppBadge = vi.fn().mockRejectedValue(new Error('not installed'));
    await expect(setBadge()).resolves.toBeUndefined();
    await expect(clearBadge()).resolves.toBeUndefined();
  });
});
