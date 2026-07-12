/**
 * Tests composant — SiteNavView (nav unifiée du shell, #276 / épic #273).
 *
 * SiteNavView est la partie **présentationnelle pure** (sans session) : c'est là
 * que vit toute la logique de rendu. Le wrapper `SiteNav` ne fait que résoudre la
 * variante depuis `useSession` puis déléguer ici.
 *
 * Vérifie :
 * 1. Variante guest : marque → `/`, liens publics (Manifesto, Se connecter),
 *    CTA « Créer un compte » → /register, AUCUN ThemeToggle (règle landing figée)
 * 2. Variante connecté : marque → `/discover`, ThemeToggle (Mode), Paramètres ;
 *    Admin seulement si `isAdmin`
 * 3. Barre theme-aware : sticky, bg-surface translucide + blur, hairline, pt-safe
 * 4. Échelle de largeurs #277 : colonne interne = SiteShell (max-w-content défaut,
 *    max-w-lg en width="app")
 * 5. A11y : landmark <nav aria-label>, marque labellisée, cibles ≥ 44px
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import SiteNav, { SiteNavView } from '../SiteNav';

vi.mock('next-auth/react', () => ({ useSession: vi.fn() }));
const mockSession = vi.mocked(useSession);

describe('<SiteNavView /> — variante guest', () => {
  it('exposes brand → /, public links and the register CTA, no ThemeToggle', () => {
    render(<SiteNavView variant="guest" />);

    expect(screen.getByRole('link', { name: 'Accueil Libre' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Manifesto' })).toHaveAttribute('href', '/manifesto');
    expect(screen.getByRole('link', { name: 'Se connecter' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Créer un compte' })).toHaveAttribute('href', '/register');

    // Règle figée : la landing/guest n'expose aucun sélecteur (ThemeToggle = bouton).
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Paramètres' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Administration' })).toBeNull();
  });
});

describe('<SiteNavView /> — variante connecté', () => {
  it('exposes brand → /discover, a Mode toggle and Paramètres (no admin by default)', () => {
    render(<SiteNavView variant="authed" />);

    expect(screen.getByRole('link', { name: 'Accueil Libre' })).toHaveAttribute('href', '/discover');
    // ThemeToggle = un unique bouton (axe Mode)
    const toggle = screen.getByRole('button');
    expect(toggle.getAttribute('aria-label') ?? '').toMatch(/Apparence/);
    expect(screen.getByRole('link', { name: 'Paramètres' })).toHaveAttribute('href', '/settings');

    // Pas d'admin sans le flag, ni de CTA/liens guest.
    expect(screen.queryByRole('link', { name: 'Administration' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Créer un compte' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Se connecter' })).toBeNull();
  });

  it('shows the Admin link only when isAdmin', () => {
    render(<SiteNavView variant="authed" isAdmin />);
    expect(screen.getByRole('link', { name: 'Administration' })).toHaveAttribute('href', '/admin');
  });
});

describe('<SiteNavView /> — barre & largeurs', () => {
  it('is a sticky, theme-aware translucent bar with safe-area', () => {
    const { container } = render(<SiteNavView variant="guest" />);
    const bar = container.firstElementChild as HTMLElement;
    expect(bar).toHaveClass('sticky', 'bg-surface/80', 'backdrop-blur-md', 'border-hairline', 'pt-safe');
  });

  it('uses the centralized width scale for the inner column (#277)', () => {
    const { container, rerender } = render(<SiteNavView variant="guest" />);
    // La colonne interne est un SiteShell (enfant direct du <nav>).
    let column = container.querySelector('nav > div') as HTMLElement;
    expect(column).toHaveClass('mx-auto', 'max-w-content');

    rerender(<SiteNavView variant="authed" width="app" />);
    column = container.querySelector('nav > div') as HTMLElement;
    expect(column).toHaveClass('max-w-lg');
  });

  it('exposes a labelled nav landmark and ≥44px touch targets', () => {
    render(<SiteNavView variant="guest" />);
    expect(screen.getByRole('navigation', { name: 'Navigation principale' })).toBeInTheDocument();
    // Le CTA et les liens publics respectent la cible tactile.
    expect(screen.getByRole('link', { name: 'Créer un compte' })).toHaveClass('min-h-[44px]');
    expect(screen.getByRole('link', { name: 'Se connecter' })).toHaveClass('min-h-[44px]');
  });
});

describe('<SiteNav /> — dérivation depuis la session', () => {
  beforeEach(() => mockSession.mockReset());

  it('renders the guest variant when unauthenticated', () => {
    mockSession.mockReturnValue({ data: null, status: 'unauthenticated' } as never);
    render(<SiteNav />);
    expect(screen.getByRole('link', { name: 'Accueil Libre' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Créer un compte' })).toBeInTheDocument();
  });

  it('renders the authed variant with Admin when the session role is ADMIN', () => {
    mockSession.mockReturnValue({
      data: { user: { role: 'admin' } },
      status: 'authenticated',
    } as never);
    render(<SiteNav />);
    expect(screen.getByRole('link', { name: 'Accueil Libre' })).toHaveAttribute('href', '/discover');
    expect(screen.getByRole('link', { name: 'Administration' })).toHaveAttribute('href', '/admin');
  });

  it('honours an explicit variant override regardless of session', () => {
    mockSession.mockReturnValue({ data: null, status: 'unauthenticated' } as never);
    render(<SiteNav variant="authed" />);
    expect(screen.getByRole('link', { name: 'Paramètres' })).toBeInTheDocument();
  });
});
