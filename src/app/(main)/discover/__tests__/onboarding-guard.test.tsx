/**
 * Tests — garde du parcours d'accueil sur Découvrir (spec 005, R2).
 * Découvrir lit déjà le profil pour ses filtres : si le parcours n'est pas
 * terminé, on y envoie avant de charger le feed.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/discover',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: 'u1' } }, status: 'authenticated' }),
}));
vi.mock('next/dynamic', () => ({ default: () => () => null }));

import DiscoverPage from '../page';

const calls: string[] = [];
function stubFetch(profile: Record<string, unknown> | null) {
  calls.length = 0;
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    calls.push(url);
    if (url === '/api/users/profile') {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ profile }) } as Response);
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => ({ users: [], nextCursor: null }) } as Response);
  }));
}

beforeEach(() => mockReplace.mockClear());
afterEach(() => vi.unstubAllGlobals());

describe('Découvrir — garde /bienvenue', () => {
  it('parcours non terminé → redirection, et le feed n’est pas demandé', async () => {
    stubFetch({ onboardingStep: 1, photos: [], relationshipType: [], lastGeolocAt: null, cityLabel: null });
    render(<DiscoverPage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/bienvenue'));
    expect(calls.some((u) => u.startsWith('/api/discover'))).toBe(false);
  });

  it('parcours terminé → pas de redirection, le feed se charge', async () => {
    stubFetch({ onboardingStep: 3, photos: ['a'], relationshipType: ['libre'], lastGeolocAt: null, cityLabel: 'Nantes (44)' });
    render(<DiscoverPage />);
    await waitFor(() => expect(calls.some((u) => u.startsWith('/api/discover'))).toBe(true));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('profil absent → redirection', async () => {
    stubFetch(null);
    render(<DiscoverPage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/bienvenue'));
  });
});
