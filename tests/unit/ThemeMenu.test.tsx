import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// useSession pilote l'invitation guest ; par défaut : non connecté.
type SessionShape = { data: { user: { id: string } } | null; status: string };
const mockSession = vi.fn(
  (): SessionShape => ({ data: null, status: 'unauthenticated' }),
);
vi.mock('next-auth/react', () => ({ useSession: () => mockSession() }));

import ThemeMenu from '@/components/ui/ThemeMenu';

// jsdom n'implémente pas matchMedia (le hook l'utilise pour le mode auto).
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
  localStorage.clear();
  document.documentElement.className = '';
  document.documentElement.removeAttribute('data-theme');
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('ThemeMenu', () => {
  it('ouvre le panneau et expose les axes Mode + Thème', () => {
    render(<ThemeMenu />);
    const trigger = screen.getByRole('button', { name: /thème et apparence/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Clair', pressed: false })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Sombre' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Auto' })).toBeInTheDocument();
    // Les 5 thèmes du catalogue sont présents.
    expect(within(dialog).getByRole('button', { name: /Cartoon/ })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /Arcade/ })).toBeInTheDocument();
  });

  it('choisir « Sombre » pose .dark sur <html> et persiste le mode', () => {
    render(<ThemeMenu />);
    fireEvent.click(screen.getByRole('button', { name: /thème et apparence/i }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sombre' }));

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('libre-theme')).toBe('dark');
  });

  it('choisir un thème re-skinne <html> (data-theme) et le persiste', () => {
    render(<ThemeMenu />);
    fireEvent.click(screen.getByRole('button', { name: /thème et apparence/i }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Arcade/ }));

    expect(document.documentElement.getAttribute('data-theme')).toBe('arcade');
    expect(localStorage.getItem('libre-skin')).toBe('arcade');
  });

  it('invite le visiteur non connecté à créer un compte', () => {
    render(<ThemeMenu />);
    fireEvent.click(screen.getByRole('button', { name: /thème et apparence/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('link', { name: /crée un compte/i })).toHaveAttribute('href', '/register');
    expect(within(dialog).getByRole('link', { name: /connecte-toi/i })).toHaveAttribute('href', '/login');
  });

  it('masque l’invitation quand l’utilisateur est connecté', () => {
    mockSession.mockReturnValue({ data: { user: { id: 'u1' } }, status: 'authenticated' });
    render(<ThemeMenu />);
    fireEvent.click(screen.getByRole('button', { name: /thème et apparence/i }));
    expect(within(screen.getByRole('dialog')).queryByRole('link', { name: /crée un compte/i })).toBeNull();
  });
});
