import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LobbyFooter from '@/components/home-lobby/LobbyFooter';

describe('LobbyFooter', () => {
  it('expose les liens légaux (visiteur non connecté) avec les bons href', () => {
    render(<LobbyFooter />);
    const expected = {
      'Conditions générales d’utilisation': '/cgu',
      'Politique de confidentialité': '/confidentialite',
      'Mentions légales': '/mentions-legales',
      FAQ: '/faq/session-expiree',
    };
    for (const [name, href] of Object.entries(expected)) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    }
  });

  it('rend un landmark footer + nav légale labellisée', () => {
    const { container } = render(<LobbyFooter />);
    expect(container.querySelector('footer.lobby-footer')).not.toBeNull();
    expect(
      screen.getByRole('navigation', { name: /liens légaux/i }),
    ).toBeInTheDocument();
  });

  it('garde social (TikTok) et code source ouvert', () => {
    render(<LobbyFooter />);
    expect(
      screen.getByRole('link', { name: /tiktok/i }),
    ).toHaveAttribute('href', 'https://tiktok.com/@getlibre_fr');
    expect(
      screen.getByRole('link', { name: /github\.com\/double-v\/libre/i }),
    ).toHaveAttribute('href', 'https://github.com/double-v/libre');
  });
});
