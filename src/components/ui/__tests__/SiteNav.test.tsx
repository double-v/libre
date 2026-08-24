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
 * 3. Barre theme-aware : sticky, translucide via tokens --nav-* (bg-nav-surface +
 *    border-nav-border) + blur, pt-safe ; texte routé sur les tokens nav
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

  it('la marque utilise le glyphe cœur de référence (HeartMark), plus le cœur-soleil à rayons (#294)', () => {
    const { container } = render(<SiteNavView variant="guest" />);
    const brand = screen.getByRole('link', { name: 'Accueil Libre' });
    // glyphe de référence = un path cœur unique ; l'ancien cœur-soleil avait 5 <rect>.
    expect(brand.querySelector('path')).toHaveAttribute('d', expect.stringMatching(/^M12 21s-7\.5-4\.6-10-9\.3/));
    expect(container.querySelectorAll('rect')).toHaveLength(0);
  });

  it('encapsule le cœur dans la pastille coral signature de la lobby-nav — fond coral, cœur blanc, radius theme-aware (#282)', () => {
    render(<SiteNavView variant="guest" />);
    const brand = screen.getByRole('link', { name: 'Accueil Libre' });
    // Rapprochement #282 : pastille coral (bg-coral + glyphe text-white) au radius
    // theme-aware `rounded-control` — fidèle au `.lobby-nav__logo`, pas un cœur nu.
    const pastille = brand.querySelector('svg')!.parentElement as HTMLElement;
    expect(pastille).toHaveClass('bg-coral', 'text-white', 'rounded-control');
    // Le wordmark reprend la couleur de texte de la nav (token --nav-text,
    // theme-aware ; always-dark sous [data-lobby] pour la home), pas coral.
    expect(brand.querySelector('span:last-child')).toHaveClass('text-nav-text');
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
  it('is a sticky, theme-aware translucent bar (tokens --nav-*) with safe-area', () => {
    const { container } = render(<SiteNavView variant="guest" />);
    const bar = container.firstElementChild as HTMLElement;
    // La barre consomme les tokens nav (base = surface/hairline ; surchargés en
    // instance always-dark sous [data-lobby] → look home), pas bg-surface/hairline directs.
    expect(bar).toHaveClass('sticky', 'bg-nav-surface', 'backdrop-blur-md', 'border-nav-border', 'pt-safe');
  });

  it('routes public links through the dimmed nav text token', () => {
    render(<SiteNavView variant="guest" />);
    // Les liens publics (Manifesto/Se connecter) = text-nav-text-dim (theme-aware,
    // clair sur la home always-dark) au lieu de text-muted direct.
    expect(screen.getByRole('link', { name: 'Se connecter' })).toHaveClass('text-nav-text-dim');
    expect(screen.getByRole('link', { name: 'Manifesto' })).toHaveClass('text-nav-text-dim');
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

  it('collapses cleanly on mobile: Manifesto hidden < sm, CTA never wraps', () => {
    // Garde de non-régression du bug mobile (invisible en jsdom, vu au pixel) :
    // la base des liens ne doit PAS porter d'`inline-flex` inconditionnel, sinon
    // il écrase le `hidden` responsive → Manifesto restait visible < sm.
    render(<SiteNavView variant="guest" />);
    const manifesto = screen.getByRole('link', { name: 'Manifesto' });
    expect(manifesto).toHaveClass('hidden', 'sm:inline-flex');
    expect(manifesto).not.toHaveClass('inline-flex');
    // Le CTA reste sur une ligne quand la barre se resserre.
    expect(screen.getByRole('link', { name: 'Créer un compte' })).toHaveClass('whitespace-nowrap');
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

/**
 * Sections de l'app dans la barre (#347, amendement desktop de l'épic #273).
 *
 * Deux surfaces rendent les mêmes quatre destinations à des breakpoints
 * différents — `SiteNav` à partir de `md`, la bottom tab bar en-dessous — et ne
 * coexistent jamais. Ces tests verrouillent le contrat de la surface desktop :
 * qui les affiche, laquelle est marquée active, et le plancher de cible tactile.
 * Ils ne prouvent rien sur des pixels : l'empilement des deux navs se vérifie
 * en E2E (cf. CLAUDE.md, deux gates).
 */
describe('<SiteNavView /> — sections de l’app (#347)', () => {
  const sections = ['Découvrir', 'Messages', 'La Place', 'Profil'];

  it('renders the four sections for the authed variant when asked', () => {
    render(<SiteNavView variant="authed" showSections pathname="/discover" />);
    for (const label of sections) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: 'Messages' })).toHaveAttribute('href', '/messages');
    expect(screen.getByRole('link', { name: 'La Place' })).toHaveAttribute('href', '/square');
  });

  it('keeps them out of the guest bar and of the authed bar that did not ask', () => {
    // Un inscrit qui lit /manifesto est bien `authed` : la page n'est pas l'app
    // pour autant, et n'a pas de tab bar à remplacer. D'où l'opt-in explicite.
    const { unmount } = render(<SiteNavView variant="authed" pathname="/manifesto" />);
    expect(screen.queryByRole('link', { name: 'Découvrir' })).toBeNull();
    unmount();

    render(<SiteNavView variant="guest" showSections pathname="/" />);
    expect(screen.queryByRole('link', { name: 'Découvrir' })).toBeNull();
  });

  it('marks the current section — and stays marked on its sub-routes', () => {
    const { unmount } = render(<SiteNavView variant="authed" showSections pathname="/messages" />);
    expect(screen.getByRole('link', { name: 'Messages' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Découvrir' })).not.toHaveAttribute('aria-current');
    unmount();

    // /messages/abc reste dans Messages : l'état actif suit la sous-route.
    render(<SiteNavView variant="authed" showSections pathname="/messages/abc" />);
    expect(screen.getByRole('link', { name: 'Messages' })).toHaveAttribute('aria-current', 'page');
  });

  it('hides them below md and holds the 44px touch floor', () => {
    render(<SiteNavView variant="authed" showSections pathname="/discover" />);
    const discover = screen.getByRole('link', { name: 'Découvrir' });
    // Sous `md`, c'est la tab bar qui navigue : un seul landmark par breakpoint.
    expect(discover.parentElement).toHaveClass('hidden', 'md:flex');
    // La pastille du canvas fait 40px ; la cible, elle, garde le plancher.
    expect(discover).toHaveClass('min-h-[44px]');
  });
});
