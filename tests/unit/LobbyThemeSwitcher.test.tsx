import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LobbyThemeSwitcher from '@/components/home-lobby/LobbyThemeSwitcher';

describe('LobbyThemeSwitcher', () => {
  it('rend les 3 thèmes en groupe étiqueté', () => {
    render(<LobbyThemeSwitcher value="cartoon" onChange={() => {}} />);
    expect(screen.getByRole('group', { name: /aperçu du thème/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cartoon' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Arcade' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rétro 8-bit' })).toBeInTheDocument();
  });

  it('marque le thème actif via aria-pressed', () => {
    render(<LobbyThemeSwitcher value="arcade" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Arcade' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Cartoon' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Rétro 8-bit' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('appelle onChange avec l’id du thème cliqué', () => {
    const onChange = vi.fn();
    render(<LobbyThemeSwitcher value="cartoon" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Rétro 8-bit' }));
    expect(onChange).toHaveBeenCalledWith('retro');
  });
});
