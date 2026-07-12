/**
 * Tests — migration de /manifesto sur le shell unifié (#278, épic #273).
 *
 * Verrouille les critères du ticket :
 *  - la nav recodée à la main est remplacée par le SiteNav partagé (variante guest) ;
 *  - plus aucune largeur ad hoc (`max-w-2xl`) — l'échelle centralisée (SiteShell) prend le relais ;
 *  - le contenu du manifesto et le SEO (canonical + title) sont préservés.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ManifestoPage, { metadata } from '../page';

describe('<ManifestoPage /> — shell migration (#278)', () => {
  it('utilise le SiteNav partagé (variante guest) au lieu d’une nav recodée', () => {
    render(<ManifestoPage />);
    const nav = screen.getByRole('navigation', { name: 'Navigation principale' });
    expect(nav).toBeInTheDocument();
    // liens guest du shell
    expect(
      screen.getByRole('link', { name: /Se connecter/i }),
    ).toHaveAttribute('href', '/login');
    expect(
      screen.getByRole('link', { name: /Créer un compte/i }),
    ).toHaveAttribute('href', '/register');
    // Discriminant du shell : la nav partagée expose un lien « Manifesto »
    // que l'ancienne nav recodée n'avait pas.
    expect(screen.getByRole('link', { name: 'Manifesto' })).toHaveAttribute(
      'href',
      '/manifesto',
    );
  });

  it('ne recode plus de largeur ad hoc (max-w-2xl)', () => {
    const { container } = render(<ManifestoPage />);
    expect(container.innerHTML).not.toMatch(/max-w-2xl/);
  });

  it('préserve le contenu et les sections clés du manifesto', () => {
    render(<ManifestoPage />);
    expect(
      screen.getByRole('heading', { name: /Rencontrer ne devrait rien coûter/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/On est libres de/i)).toBeInTheDocument();
    expect(screen.getByText(/On refuse de/i)).toBeInTheDocument();
    expect(screen.getByText(/Comment on finance la maison/i)).toBeInTheDocument();
  });

  it('préserve le SEO (canonical + title manifesto)', () => {
    expect(metadata.title).toMatch(/Manifesto/);
    expect(metadata.alternates?.canonical).toBe(
      'https://www.getlibre.fr/manifesto',
    );
  });
});
