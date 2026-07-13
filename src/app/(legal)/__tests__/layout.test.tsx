/**
 * Tests — migration des pages (legal) sur le shell unifié (#279, épic #273).
 *
 * Verrouille les critères du ticket :
 *  - le layout consomme le SiteNav partagé (variante guest par défaut) au lieu de TopNav ;
 *  - plus aucune largeur ad hoc (max-w-3xl) — l'échelle centralisée (SiteShell) prend le relais ;
 *  - le fil d'Ariane, les liens légaux de pied de page et un landmark <main id="main-content">
 *    (cible du skip-link fourni par le layout racine) sont préservés.
 *
 * Discriminants TopNav vs SiteNav : SiteNav expose <nav aria-label="Navigation
 * principale"> (TopNav utilise <header>) et, en variante guest, n'affiche AUCUN
 * ThemeToggle (bouton) — TopNav en affiche toujours un.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import LegalLayout from '../layout';

vi.mock('next-auth/react', () => ({ useSession: vi.fn() }));
const mockSession = vi.mocked(useSession);

beforeEach(() => {
  mockSession.mockReturnValue({
    data: null,
    status: 'unauthenticated',
  } as ReturnType<typeof useSession>);
});

describe('LegalLayout — shell migration (#279)', () => {
  it('consomme le SiteNav partagé (variante guest) au lieu de TopNav', () => {
    render(
      <LegalLayout>
        <p>Contenu légal</p>
      </LegalLayout>,
    );
    // SiteNav expose <nav aria-label="Navigation principale"> ; TopNav utilise <header>.
    expect(
      screen.getByRole('navigation', { name: 'Navigation principale' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Se connecter' })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(screen.getByRole('link', { name: 'Créer un compte' })).toHaveAttribute(
      'href',
      '/register',
    );
    // Discriminant fort : la variante guest du shell n'expose AUCUN ThemeToggle
    // (bouton), là où TopNav en affiche toujours un.
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('ne recode plus de largeur ad hoc (max-w-3xl)', () => {
    const { container } = render(
      <LegalLayout>
        <p>Contenu légal</p>
      </LegalLayout>,
    );
    expect(container.innerHTML).not.toMatch(/max-w-3xl/);
  });

  it('adopte la largeur contenu globale (content 1080, plus reading 720) — #293', () => {
    const { container } = render(
      <LegalLayout>
        <p>Contenu légal</p>
      </LegalLayout>,
    );
    expect(container.innerHTML).toMatch(/max-w-content/);
    expect(container.innerHTML).not.toMatch(/max-w-reading/);
  });

  it('expose un landmark <main id="main-content"> (cible du skip-link racine)', () => {
    render(
      <LegalLayout>
        <p>Contenu légal</p>
      </LegalLayout>,
    );
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
  });

  it('préserve le fil d’Ariane, les liens légaux et le contenu', () => {
    render(
      <LegalLayout>
        <p data-testid="child">Contenu légal</p>
      </LegalLayout>,
    );
    expect(
      screen.getByRole('navigation', { name: "Fil d'Ariane" }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'CGU' })).toHaveAttribute(
      'href',
      '/cgu',
    );
    expect(
      screen.getByRole('link', { name: /confidentialité/i }),
    ).toHaveAttribute('href', '/confidentialite');
    expect(
      screen.getByRole('link', { name: 'Mentions légales' }),
    ).toHaveAttribute('href', '/mentions-legales');
    expect(screen.getByRole('link', { name: 'FAQ' })).toHaveAttribute(
      'href',
      '/faq',
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});
