import { render, screen } from '@testing-library/react';
import { describe, expect, it, beforeAll, vi } from 'vitest';
import LobbyHero from '@/components/home-lobby/LobbyHero';

// jsdom n'implémente pas matchMedia ; RotatingWord l'utilise (reduced-motion).
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('LobbyHero', () => {
  it('rend un seul h1 avec l’accroche FR et le 1er mot rotatif', () => {
    render(<LobbyHero />);
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    // 1er mot rendu côté SSR (stable) = décision #240
    expect(headings[0]).toHaveTextContent(/Rencontrer devrait\s*pas\s*coûter\s*un abonnement/);
  });

  it('branche les CTA sur les vraies routes', () => {
    render(<LobbyHero />);
    expect(screen.getByRole('link', { name: 'Rejoindre la bande' })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('link', { name: 'Se connecter' })).toHaveAttribute('href', '/login');
  });

  it('affiche les 4 chips confiance', () => {
    render(<LobbyHero />);
    for (const label of ['Gratuit', 'Sans pub', 'Sans revente', 'Modération humaine']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('affiche le compteur quand userCount > 0, le masque sinon', () => {
    const { rerender } = render(<LobbyHero userCount={1234} />);
    expect(screen.getByText(/célibataires ont déjà rejoint/)).toBeInTheDocument();
    rerender(<LobbyHero userCount={0} />);
    expect(screen.queryByText(/célibataires ont déjà rejoint/)).not.toBeInTheDocument();
  });

  it('réserve le slot latéral et affiche le panneau fourni', () => {
    const { rerender } = render(<LobbyHero />);
    expect(screen.getByText(/Comment ça marche/)).toBeInTheDocument();
    rerender(<LobbyHero sidePanel={<div>Panneau réel</div>} />);
    expect(screen.getByText('Panneau réel')).toBeInTheDocument();
  });
});
