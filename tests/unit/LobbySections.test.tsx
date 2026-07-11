import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LobbyHumans from '@/components/home-lobby/LobbyHumans';
import LobbySafety from '@/components/home-lobby/LobbySafety';
import LobbyClosing from '@/components/home-lobby/LobbyClosing';

describe('LobbyHumans', () => {
  it('rend le titre h2 et 3 cartes récit avec photo (alt) + légende', () => {
    render(<LobbyHumans />);
    expect(
      screen.getByRole('heading', { level: 2, name: /des humains, pas des profils/i }),
    ).toBeInTheDocument();

    const imgs = screen.getAllByRole('img');
    expect(imgs).toHaveLength(3);
    // chaque photo a un alt non vide (a11y)
    imgs.forEach((img) => expect(img.getAttribute('alt')).toBeTruthy());

    // légendes narratives présentes
    expect(screen.getByText(/Duo hétéro/)).toBeInTheDocument();
    expect(screen.getByText(/Duo de femmes/)).toBeInTheDocument();
    expect(screen.getByText(/Duo non-binaire/)).toBeInTheDocument();
  });
});

describe('LobbySafety', () => {
  it('rend le tag modération 24/7, le titre et la copy zéro-revente', () => {
    const { container } = render(<LobbySafety />);
    expect(screen.getByText(/modération\s+humaine 24\/7/i)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /ta sécurité, tenue par des humains/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/zéro revente de données/i)).toBeInTheDocument();
    // bouclier décoratif présent
    expect(container.querySelector('.lobby-safety__shield svg')).not.toBeNull();
  });
});

describe('LobbyClosing', () => {
  it('rend le titre et un CTA lien vers /register', () => {
    render(<LobbyClosing />);
    expect(
      screen.getByRole('heading', { level: 2, name: /libre grandit avec sa bande/i }),
    ).toBeInTheDocument();

    const cta = screen.getByRole('link', { name: /créer mon profil/i });
    expect(cta).toHaveAttribute('href', '/register');
  });
});
