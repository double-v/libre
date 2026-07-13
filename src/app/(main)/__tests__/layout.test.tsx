/**
 * Tests — migration de l'app connectée (main) sur le shell unifié (#280, épic #273).
 *
 * Verrouille les critères du ticket :
 *  - le layout consomme `SiteNav` (variante connectée) au lieu de `TopNav` ;
 *  - la bottom tab bar est conservée (4 onglets) mais sous un label distinct
 *    (« Navigation des sections ») pour ne pas dupliquer le landmark
 *    « Navigation principale » désormais porté par `SiteNav` ;
 *  - `ThemeToggle` conservé, bannière bêta toujours câblée dans la nav.
 *
 * Les enfants dynamiques (MatchDialog / FeedbackButton / ToastHost) sont hors
 * périmètre du layout → `next/dynamic` est neutralisé.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import MainLayout from '../layout';

vi.mock('next/navigation', () => ({ usePathname: () => '/discover' }));
vi.mock('next-auth/react', () => ({ useSession: vi.fn() }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));

const mockSession = vi.mocked(useSession);

beforeEach(() => {
  mockSession.mockReturnValue({
    data: { user: { id: 'u1', role: 'USER' }, expires: '' },
    status: 'authenticated',
  } as unknown as ReturnType<typeof useSession>);
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok: true, json: async () => ({}) } as Response)),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('MainLayout — shell migration (#280)', () => {
  it('utilise SiteNav (variante connectée) comme nav du haut au lieu de TopNav', () => {
    render(
      <MainLayout>
        <p>Contenu app</p>
      </MainLayout>,
    );
    // SiteNav porte le landmark « Navigation principale » ET, en variante
    // connectée, la marque → /discover, le ThemeToggle et Paramètres.
    // (La tab bar historique portait ce label sans marque ni toggle.)
    const topNav = screen.getByRole('navigation', { name: 'Navigation principale' });
    expect(within(topNav).getByRole('link', { name: 'Accueil Libre' })).toHaveAttribute(
      'href',
      '/discover',
    );
    expect(within(topNav).getByRole('button', { name: /Apparence/ })).toBeInTheDocument();
    expect(within(topNav).getByRole('link', { name: 'Paramètres' })).toHaveAttribute(
      'href',
      '/settings',
    );
  });

  it('conserve la bottom tab bar (4 onglets) sous un label distinct', () => {
    render(
      <MainLayout>
        <p>Contenu app</p>
      </MainLayout>,
    );
    const tabBar = screen.getByRole('navigation', { name: 'Navigation des sections' });
    expect(within(tabBar).getByRole('link', { name: 'Découvrir' })).toHaveAttribute(
      'href',
      '/discover',
    );
    expect(within(tabBar).getByRole('link', { name: 'Messages' })).toHaveAttribute(
      'href',
      '/messages',
    );
    expect(within(tabBar).getByRole('link', { name: 'La Place' })).toHaveAttribute(
      'href',
      '/square',
    );
    expect(within(tabBar).getByRole('link', { name: 'Profil' })).toHaveAttribute(
      'href',
      '/profile',
    );
  });

  it('conserve le ThemeToggle (bouton Apparence)', () => {
    render(
      <MainLayout>
        <p>Contenu app</p>
      </MainLayout>,
    );
    expect(screen.getByRole('button', { name: /Apparence/ })).toBeInTheDocument();
  });

  it('câble la bannière bêta dans la nav', () => {
    render(
      <MainLayout>
        <p>Contenu app</p>
      </MainLayout>,
    );
    // La bannière se révèle post-montage (aucune clé de dismiss en localStorage).
    expect(screen.getByText('Bêta')).toBeInTheDocument();
  });
});
