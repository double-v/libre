import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';

// next/font ne peut pas s'exécuter hors compilation Next : on stub la classe de vars.
vi.mock('@/lib/fonts', () => ({ lobbyFontVars: 'font-vars-mock' }));

import HomeLobby from '@/components/home-lobby/HomeLobby';
import { LOBBY_STORAGE_KEY } from '@/components/home-lobby/lobby-theme';

describe('HomeLobby (shell #244)', () => {
  beforeEach(() => {
    localStorage.removeItem(LOBBY_STORAGE_KEY);
  });

  it('démarre en cartoon (défaut SSR)', () => {
    const { container } = render(<HomeLobby />);
    expect(container.querySelector('[data-lobby]')).toHaveAttribute('data-lobby', 'cartoon');
    expect(screen.getByRole('button', { name: 'Cartoon' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('changer de thème met à jour data-lobby, le storage et la pill active', () => {
    const { container } = render(<HomeLobby />);
    fireEvent.click(screen.getByRole('button', { name: 'Rétro 8-bit' }));

    expect(container.querySelector('[data-lobby]')).toHaveAttribute('data-lobby', 'retro');
    expect(localStorage.getItem(LOBBY_STORAGE_KEY)).toBe('retro');
    expect(screen.getByRole('button', { name: 'Rétro 8-bit' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Cartoon' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('rend le script no-flash en premier enfant du conteneur', () => {
    const { container } = render(<HomeLobby />);
    const root = container.querySelector('[data-lobby]');
    const firstChild = root?.firstElementChild;
    expect(firstChild?.tagName).toBe('SCRIPT');
    expect(firstChild?.innerHTML).toContain('data-lobby');
  });
});
