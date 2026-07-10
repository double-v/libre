import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LobbyNav from '@/components/home-lobby/LobbyNav';

describe('LobbyNav', () => {
  it('lie la marque à / et les liens aux vraies routes', () => {
    render(<LobbyNav themeValue="cartoon" onThemeChange={() => {}} />);
    expect(screen.getByRole('link', { name: /accueil libre/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Manifesto' })).toHaveAttribute('href', '/manifesto');
    expect(screen.getByRole('link', { name: 'Se connecter' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Créer un compte' })).toHaveAttribute('href', '/register');
  });

  it('intègre le switcher de thème et propage le changement', () => {
    const onThemeChange = vi.fn();
    render(<LobbyNav themeValue="cartoon" onThemeChange={onThemeChange} />);
    expect(screen.getByRole('group', { name: /aperçu du thème/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Arcade' }));
    expect(onThemeChange).toHaveBeenCalledWith('arcade');
  });

  it('marque la nav comme repère de navigation', () => {
    render(<LobbyNav themeValue="retro" onThemeChange={() => {}} />);
    expect(screen.getByRole('navigation', { name: /navigation principale/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rétro 8-bit' })).toHaveAttribute('aria-pressed', 'true');
  });
});
