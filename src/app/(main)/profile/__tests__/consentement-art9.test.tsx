/**
 * /profile — la case art. 9 avant la première saisie sensible (#425).
 *
 * Tant que le compte n'a pas consenti, chaque section qui touche
 * l'orientation, le genre, les pratiques ou les personnes cherchées montre la
 * case ; enregistrer sans la cocher est refusé sur place, et la cocher envoie
 * `sensitiveConsent: true` avec la première écriture. Après consentement, la
 * case disparaît partout.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

// Router stable (cf. page.test.tsx) : un objet neuf par rendu relancerait
// `fetchProfile` et écraserait `sensitiveConsent` après le PUT.
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/lib/session-cleanup', () => ({ purgerSecretsLocaux: vi.fn() }));
vi.mock('@/lib/toast', () => ({ toast: vi.fn() }));

import ProfilePage from '../page';
import { COPY_CONSENT_SENSIBLE } from '@/components/ConsentSensibleField';

const base: Record<string, unknown> = {
  userId: 'u1', displayName: 'Sam', isVerified: false, bio: '', birthDate: '1992-01-01T00:00:00.000Z', genderIdentity: '',
  orientation: [], relationshipType: [], interests: [], practices: [], socialLinks: {}, photos: [],
  maxDistanceKm: 50, ageMin: 18, ageMax: 99, searchGenders: [], searchOrientations: [], searchRelationshipTypes: [], searchInterests: [],
  searchDistanceKm: null, practicesVisibility: 'matches', photoSensitivityOptIn: 'none', invisibleMode: false, positionSource: null, cityLabel: null,
};

let puts: Array<Record<string, unknown>>;

function stubFetch(sensitiveConsent: boolean) {
  puts = [];
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
    if (url === '/api/users/profile' && init?.method === 'PUT') {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      puts.push(body);
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ profile: { ...base, ...body } }) } as Response);
    }
    if (url === '/api/users/profile') {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ profile: base, displayName: 'Sam', isVerified: false, photoSensitivity: {}, sensitiveConsent }) } as Response);
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => ({}) } as Response);
  }));
}

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

async function ouvrir(sensitiveConsent: boolean, section: string) {
  stubFetch(sensitiveConsent);
  render(<ProfilePage />);
  await screen.findByRole('heading', { name: 'Profil' });
  fireEvent.click(screen.getByRole('button', { name: `Modifier ${section}` }));
}

describe('/profile — consentement art. 9', () => {
  it('sans consentement : la case est là, enregistrer sans cocher est refusé, cocher envoie le consentement', async () => {
    await ouvrir(false, 'Ce que je cherche');
    fireEvent.click(screen.getByRole('button', { name: 'Bi' }));
    const section = () => within(document.getElementById('profile-section-seeking')!);
    const consent = section().getByRole('checkbox');
    expect(section().getByText(/J’accepte que Libre enregistre/)).toBeInTheDocument();
    expect(consent).not.toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText(COPY_CONSENT_SENSIBLE.requis)).toBeInTheDocument();
    expect(puts).toHaveLength(0);

    fireEvent.click(consent);
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0]).toMatchObject({ orientation: ['bi'], sensitiveConsent: true });
    // Une fois donné, la case ne revient pas dans une autre section.
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Enregistrer' })).toBeNull());
    const pratiques = () => within(document.getElementById('profile-section-practices')!);
    fireEvent.click(pratiques().getByRole('button', { expanded: false }));
    fireEvent.click(pratiques().getByRole('button', { name: /Modifier Pratiques/ }));
    expect(pratiques().getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument();
    expect(pratiques().queryByText(/J’accepte que Libre enregistre/)).toBeNull();
  }, 15_000);

  it('avec consentement : aucune case, l’écriture part telle quelle', async () => {
    await ouvrir(true, 'Ce que je cherche');
    expect(within(document.getElementById('profile-section-seeking')!).queryByText(/J’accepte que Libre enregistre/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Bi' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0]).not.toHaveProperty('sensitiveConsent');
  });

  it('sans consentement, vider un champ ne demande rien', async () => {
    await ouvrir(false, 'Ce que je cherche');
    // Rien de sélectionné → rien de sensible dans la charge : la case n'est pas exigée.
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0]).not.toHaveProperty('sensitiveConsent');
  });
});
