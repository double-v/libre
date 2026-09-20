/**
 * Tests — page /profile refondue (#413) : la page invite à compléter.
 *
 * - l'ordre des sections suit l'impact (photos d'abord), avec trois groupes ;
 * - les trois tuiles « ce qui permet d'être choisi·e » reflètent le profil ;
 * - les sections secondaires sont repliées avec un résumé ;
 * - l'aperçu public ne s'affiche qu'à la demande ;
 * - « Ce que je cherche » n'est complet que si le type de relation est là ;
 * - rien de perdu : visibilité des pratiques, seuil photos sensibles,
 *   auto-déclaration, liens, conseils, suppression (vers Paramètres).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));
vi.mock('@/lib/logout', () => ({ logout: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/session-cleanup', () => ({ purgerSecretsLocaux: vi.fn() }));
vi.mock('@/lib/toast', () => ({ toast: vi.fn() }));

import ProfilePage from '../page';

const base: Record<string, unknown> = {
  userId: 'u1', displayName: 'Sam', isVerified: false, bio: '', birthDate: '1992-01-01T00:00:00.000Z', genderIdentity: 'femme',
  orientation: ['tout'], relationshipType: [], interests: ['balade'], practices: [], socialLinks: {}, photos: [],
  maxDistanceKm: 50, ageMin: 18, ageMax: 99, searchGenders: [], searchOrientations: [], searchRelationshipTypes: [], searchInterests: [],
  searchDistanceKm: null, practicesVisibility: 'matches', photoSensitivityOptIn: 'none', invisibleMode: false, positionSource: null, cityLabel: null,
};

function stubFetch(profile: Record<string, unknown>) {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url === '/api/users/profile') return Promise.resolve({ ok: true, status: 200, json: async () => ({ profile, displayName: 'Sam', isVerified: false, photoSensitivity: {} }) } as Response);
    return Promise.resolve({ ok: true, status: 200, json: async () => ({}) } as Response);
  }));
}

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

async function renderPage(profile: Record<string, unknown> = base) {
  stubFetch(profile);
  render(<ProfilePage />);
  await screen.findByRole('heading', { name: 'Profil' });
}

describe('/profile — la page invite à compléter (#413)', () => {
  it('photos d’abord, puis ce que je cherche ; trois groupes lisibles', async () => {
    await renderPage();
    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(titles.slice(0, 2)).toEqual(['Photos', 'Ce que je cherche']);
    expect(titles.indexOf('Photos')).toBeLessThan(titles.indexOf('Pratiques & préférences'));
    for (const g of ['Ce que les autres voient', 'Où et qui je cherche', 'Intimité et confidentialité']) {
      expect(screen.getByText(g)).toBeInTheDocument();
    }
  });

  it('sans photo : la zone d’ajout est en tête, l’aperçu n’est pas rendu, les tuiles disent quoi faire', async () => {
    await renderPage();
    expect(screen.getByLabelText('Ajouter une photo')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
    const glance = screen.getByRole('navigation', { name: 'Compléter mon profil' });
    const states = within(glance).getAllByRole('link').map((l) => l.getAttribute('data-state'));
    expect(states).toEqual(['todo', 'todo', 'todo']);
    expect(document.body.textContent).not.toMatch(/\d\s*\/\s*\d/);
  });

  it('« Ce que je cherche » n’est complet qu’avec un type de relation', async () => {
    await renderPage({ ...base, orientation: ['bi'], relationshipType: [] });
    const seeking = document.getElementById('profile-section-seeking')!;
    expect(within(seeking).getByTestId('section-status')).toHaveTextContent('À compléter');
    expect(within(seeking).queryByTestId('section-complete')).toBeNull();
  });

  it('avec photo et type : en-tête compact, tuiles faites, « Voir comme les autres » ouvre l’aperçu', async () => {
    await renderPage({ ...base, photos: ['k1'], relationshipType: ['libre'], cityLabel: 'Nantes (44)', positionSource: 'city' });
    expect(screen.getByText(/Sam, 3\d/)).toBeInTheDocument();
    const glance = screen.getByRole('navigation', { name: 'Compléter mon profil' });
    expect(within(glance).getAllByRole('link').map((l) => l.getAttribute('data-state'))).toEqual(['done', 'done', 'done']);
    fireEvent.click(screen.getByRole('button', { name: /Voir comme les autres/ }));
    expect(screen.getByRole('dialog', { name: 'Ton profil vu par les autres' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('les sections secondaires sont repliées avec un résumé qui dit la valeur', async () => {
    await renderPage({ ...base, practicesVisibility: 'public', photoSensitivityOptIn: 'suggestive' });
    expect(screen.getByText(/Aucune pratique · visibles par tout le monde/)).toBeInTheDocument();
    expect(screen.getByText(/J'accepte de voir : les photos suggestives/)).toBeInTheDocument();
    expect(screen.getByText(/Tous les genres · toutes orientations · tous types · 18–99 ans · partout/)).toBeInTheDocument();
    expect(screen.getByText('Aucun lien')).toBeInTheDocument();
    // Repliée : le contrôle n'est pas rendu tant qu'on n'ouvre pas.
    expect(screen.queryByRole('button', { name: 'Tout le monde' })).toBeNull();
  });

  it('rien de perdu : déplier Pratiques montre la visibilité ; Photos sensibles ses trois seuils ; supprimer mène à Paramètres', async () => {
    await renderPage();
    fireEvent.click(within(document.getElementById('profile-section-practices')!).getByRole('button', { expanded: false }));
    expect(screen.getByRole('button', { name: 'Mes matches' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Tout le monde' })).toBeInTheDocument();
    fireEvent.click(within(document.getElementById('profile-section-photo-sensitivity')!).getByRole('button', { expanded: false }));
    expect(screen.getByRole('button', { name: 'Aucune photo sensible' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Toutes les photos' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Ma prochaine photo est suggestive/)).toBeInTheDocument();
    fireEvent.click(within(document.getElementById('profile-section-danger')!).getByRole('button', { expanded: false }));
    expect(screen.getByRole('link', { name: /Supprimer mon compte/ })).toHaveAttribute('href', '/settings#zone-dangereuse');
    expect(screen.getByRole('button', { name: 'Déconnexion' })).toBeInTheDocument();
  });
});
