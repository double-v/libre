import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// LobbyNav intègre désormais le ThemeMenu global (client, useSession).
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}));

import LobbyNav from '@/components/home-lobby/LobbyNav';

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
  global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: async () => ({}) } as Response));
});

describe('LobbyNav', () => {
  it('lie la marque à / et les liens aux vraies routes', () => {
    render(<LobbyNav />);
    expect(screen.getByRole('link', { name: /accueil libre/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Manifesto' })).toHaveAttribute('href', '/manifesto');
    expect(screen.getByRole('link', { name: 'Se connecter' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Créer un compte' })).toHaveAttribute('href', '/register');
  });

  it('intègre le ThemeMenu global (le même sélecteur que dans l’app)', () => {
    render(<LobbyNav />);
    expect(screen.getByRole('button', { name: /thème et apparence/i })).toBeInTheDocument();
  });

  it('marque la nav comme repère de navigation', () => {
    render(<LobbyNav />);
    expect(screen.getByRole('navigation', { name: /navigation principale/i })).toBeInTheDocument();
  });
});
