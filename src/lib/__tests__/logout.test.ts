/**
 * Tests — déconnexion centralisée (#389/#390).
 *
 * Quatre appels à signOut étaient dispersés (Paramètres ×2, Profil ×2). Un
 * point unique permet de retirer le badge d'icône (et, en #392, l'abonnement
 * push) AVANT la fin de session — après, on n'a plus de session pour le faire.
 * Un échec d'un préalable ne doit jamais empêcher la déconnexion elle-même.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSignOut = vi.fn().mockResolvedValue(undefined);
vi.mock('next-auth/react', () => ({ __esModule: true, signOut: mockSignOut }));

const mockClearBadge = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/app-badge', () => ({ __esModule: true, clearBadge: mockClearBadge }));

const { logout } = await import('../logout');

describe('logout', () => {
  beforeEach(() => {
    mockSignOut.mockClear();
    mockClearBadge.mockClear();
  });

  it('retire le badge puis termine la session sans redirection', async () => {
    await logout();
    expect(mockClearBadge).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledWith({ redirect: false });
    expect(mockClearBadge.mock.invocationCallOrder[0]).toBeLessThan(mockSignOut.mock.invocationCallOrder[0]);
  });

  it("un échec du badge n'empêche pas signOut", async () => {
    mockClearBadge.mockRejectedValueOnce(new Error('boom'));
    await expect(logout()).resolves.toBeUndefined();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
