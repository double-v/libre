/**
 * Tests — la carte de relance dans « Pour toi » (spec 005, FR-017/019).
 * Première cellule de la grille quand il manque quelque chose ; écartée
 * sept jours par appareil ; absente quand le profil est complet ; rendue
 * quand le stockage est indisponible (une proposition de plus, jamais une
 * relance de moins visible).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

/**
 * Le rang d'identité de la relance (#517) : il n'ouvre que quand le parcours
 * est complet — et déclare en ligne. La carte n'apparaît jamais pour qui a
 * déjà déclaré (#519) : genre puis orientation, le premier à la fois.
 */
describe('Découvrir — carte « dis qui tu es » (#517)', () => {
  it('parcours complet, genre non déclaré → carte d\'identité, pas de carte de complétion', async () => {
    stubFetch({ ...done, photos: ['a'], relationshipType: ['libre'], cityLabel: 'Nantes (44)', genderIdentity: '', orientation: [] });
    await renderAndWaitFeed();
    expect(screen.queryByLabelText('Compléter ton profil')).toBeNull();
    const card = screen.getByLabelText('Se déclarer');
    expect(card).toHaveTextContent('Dis qui tu es');
    const first = screen.getByLabelText('Profil de Camille');
    expect(card.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('genre déclaré, orientation non → la carte porte l\'orientation', async () => {
    stubFetch({ ...done, photos: ['a'], relationshipType: ['libre'], cityLabel: 'Nantes (44)', genderIdentity: 'femme', orientation: [] });
    await renderAndWaitFeed();
    expect(screen.getByLabelText('Se déclarer')).toHaveTextContent('Dis ton orientation');
  });

  it('tout déclaré → aucune carte', async () => {
    stubFetch({ ...done, photos: ['a'], relationshipType: ['libre'], cityLabel: 'Nantes (44)', genderIdentity: 'femme', orientation: ['hétéro'] });
    await renderAndWaitFeed();
    expect(screen.queryByLabelText('Se déclarer')).toBeNull();
  });

  it('écartée hier (même clé que la relance) → pas de carte d\'identité', async () => {
    stubFetch({ ...done, photos: ['a'], relationshipType: ['libre'], cityLabel: 'Nantes (44)', genderIdentity: '', orientation: [] });
    window.localStorage.setItem(NUDGE_DISMISS_KEY, new Date(Date.now() - 86_400_000).toISOString());
    await renderAndWaitFeed();
    expect(screen.queryByLabelText('Se déclarer')).toBeNull();
  });

  it('la déclaration en carte écrit genre + consent, puis le rang suit (l\'orientation prend la carte)', async () => {
    stubFetch({ ...done, photos: ['a'], relationshipType: ['libre'], cityLabel: 'Nantes (44)', genderIdentity: '', orientation: [] });
    await renderAndWaitFeed();
    // Genre et orientation manquent : la carte dit le genre d'abord.
    expect(screen.getByLabelText('Se déclarer')).toHaveTextContent('Dis qui tu es');
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.change(screen.getByLabelText('Ton genre'), { target: { value: 'femme' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    // Le rang se re-dérive : la carte se pose sur l'orientation, pas sur rien.
    await waitFor(() => expect(screen.getByLabelText('Se déclarer')).toHaveTextContent('Dis ton orientation'));
    const calls = (fetch as unknown as { mock: { calls: Array<[string, RequestInit | undefined]> } }).mock.calls;
    const request = calls.find(([url, init]) => url === '/api/users/profile' && init?.method === 'PUT');
    expect(request).toBeTruthy();
    const body = JSON.parse(String((request![1] as RequestInit).body));
    expect(body).toEqual({ genderIdentity: 'femme', sensitiveConsent: true });
  });
});
