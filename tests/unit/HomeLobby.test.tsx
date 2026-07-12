import { render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';

// La landing n'expose plus de sélecteur de thème ; le mock next-auth est
// conservé par sécurité pour d'éventuels sous-composants lisant la session.
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}));

import HomeLobby from '@/components/home-lobby/HomeLobby';

// jsdom n'implémente pas matchMedia ; RotatingWord (HERO), HomeLobby (reduced
// motion) et le ThemeMenu (mode auto) l'utilisent.
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
  global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: async () => ({}) } as Response));
});

describe('HomeLobby (landing)', () => {
  it('porte le marqueur data-lobby sur son conteneur racine', () => {
    const { container } = render(<HomeLobby />);
    expect(container.querySelector('[data-lobby]')).not.toBeNull();
  });

  it('n’expose pas de sélecteur de thème sur la landing (thème par défaut du site)', () => {
    render(<HomeLobby />);
    expect(screen.queryByRole('button', { name: /thème et apparence/i })).toBeNull();
  });

  it('expose les landmarks a11y : <main id="main-content"> + footer', () => {
    const { container } = render(<HomeLobby />);
    expect(container.querySelector('main#main-content')).not.toBeNull();
    expect(container.querySelector('footer.lobby-footer')).not.toBeNull();
  });
});
