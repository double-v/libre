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

  it('adopte la largeur contenu globale (content 1080, plus reading 720) — #293', () => {
    const { container } = render(<ManifestoPage />);
    expect(container.innerHTML).toMatch(/max-w-content/);
    expect(container.innerHTML).not.toMatch(/max-w-reading/);
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

/**
 * Le manifeste est public et indexé : il ne promet que ce qui existe (#494).
 * Aucun don n'est collecté et aucun budget n'a été publié tant que la page de
 * dons (#10) n'est pas livrée. Si elle l'est, ce test changera avec la copie.
 */
describe('<ManifestoPage /> — ne promet que ce qui existe (#494)', () => {
  it('ne prétend ni recevoir des dons ni publier un budget', () => {
    const { container } = render(<ManifestoPage />);
    const texte = container.textContent ?? '';
    expect(texte).not.toMatch(/beaucoup de dons/i);
    expect(texte).not.toMatch(/Des dons, c.est tout/i);
    expect(texte).not.toMatch(/Budget publié/i);
    expect(texte).not.toMatch(/frais juridiques/i);
    expect(texte).not.toMatch(/surplus/i);
  });

  it('dit l’état réel : offres gratuites, bénévolat, dons pas encore ouverts', () => {
    const { container } = render(<ManifestoPage />);
    const texte = container.textContent ?? '';
    expect(texte).toMatch(/offres gratuites/i);
    expect(texte).toMatch(/bénévolement/i);
    expect(texte).toMatch(/pas encore/i);
  });

  it('ne promet pas une suppression « en un clic » (le mot de passe est demandé)', () => {
    const { container } = render(<ManifestoPage />);
    expect(container.textContent).not.toMatch(/en un clic/i);
  });
});

it('#494 — les pages légales ne décrivent ni collectif ni association en cours', async () => {
  const { readFileSync } = await import('node:fs');
  for (const page of ['mentions-legales', 'confidentialite', 'cgu']) {
    const source = readFileSync(`src/app/(legal)/${page}/page.tsx`, 'utf-8');
    expect(source, page).not.toMatch(/collectif Libre/i);
    expect(source, page).not.toMatch(/en cours de constitution/i);
    expect(source, page).not.toMatch(/par des bénévoles/i);
  }
});
