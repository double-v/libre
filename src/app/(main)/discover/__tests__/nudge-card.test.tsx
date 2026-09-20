/**
 * Tests — la carte de relance dans « Pour toi » (spec 005, FR-017/019).
 * Première cellule de la grille quand il manque quelque chose ; écartée
 * sept jours par appareil ; absente quand le profil est complet ; rendue
 * quand le stockage est indisponible (une proposition de plus, jamais une
 * relance de moins visible).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { NUDGE_DISMISS_KEY } from '@/lib/onboarding';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/discover',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: 'u1' } }, status: 'authenticated' }),
}));
vi.mock('next/dynamic', () => ({ default: () => () => null }));

import DiscoverPage from '../page';

const user = {
  userId: 'u2', displayName: 'Camille', age: 34, bio: '', isVerified: false, online: false,
  photos: ['a.jpg'], veiledPhotos: [], interests: [], practices: null, genderIdentity: '', orientation: [],
};
function stubFetch(profile: Record<string, unknown>) {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url === '/api/users/profile') return Promise.resolve({ ok: true, status: 200, json: async () => ({ profile }) } as Response);
    return Promise.resolve({ ok: true, status: 200, json: async () => ({ users: [user], nextCursor: null }) } as Response);
  }));
}
const done = { onboardingStep: 3, lastGeolocAt: null, cityLabel: null };

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

async function renderAndWaitFeed() {
  render(<DiscoverPage />);
  await screen.findByLabelText('Profil de Camille');
}

describe('Découvrir — carte de relance', () => {
  it('sans photo → carte avant le premier profil', async () => {
    stubFetch({ ...done, photos: [], relationshipType: [] });
    await renderAndWaitFeed();
    const card = screen.getByLabelText('Compléter ton profil');
    const first = screen.getByLabelText('Profil de Camille');
    expect(card.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(card).toHaveTextContent('Ajoute une photo');
  });

  it('écartée hier → pas de carte ; écartée il y a huit jours → carte', async () => {
    stubFetch({ ...done, photos: [], relationshipType: [] });
    window.localStorage.setItem(NUDGE_DISMISS_KEY, new Date(Date.now() - 86_400_000).toISOString());
    await renderAndWaitFeed();
    expect(screen.queryByLabelText('Compléter ton profil')).toBeNull();
  });

  it('écartée il y a huit jours → carte', async () => {
    stubFetch({ ...done, photos: [], relationshipType: [] });
    window.localStorage.setItem(NUDGE_DISMISS_KEY, new Date(Date.now() - 8 * 86_400_000).toISOString());
    await renderAndWaitFeed();
    expect(screen.getByLabelText('Compléter ton profil')).toBeInTheDocument();
  });

  it('profil complet → pas de carte', async () => {
    stubFetch({ ...done, photos: ['a'], relationshipType: ['libre'], cityLabel: 'Nantes (44)' });
    await renderAndWaitFeed();
    expect(screen.queryByLabelText('Compléter ton profil')).toBeNull();
  });

  it('stockage indisponible → carte quand même', async () => {
    stubFetch({ ...done, photos: [], relationshipType: [] });
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    await renderAndWaitFeed();
    expect(screen.getByLabelText('Compléter ton profil')).toBeInTheDocument();
    getItem.mockRestore();
  });

  it('« Plus tard » retire la carte et pose la date sur l’appareil', async () => {
    stubFetch({ ...done, photos: [], relationshipType: [] });
    await renderAndWaitFeed();
    screen.getByRole('button', { name: 'Plus tard' }).click();
    await waitFor(() => expect(screen.queryByLabelText('Compléter ton profil')).toBeNull());
    expect(window.localStorage.getItem(NUDGE_DISMISS_KEY)).toBeTruthy();
  });
});
