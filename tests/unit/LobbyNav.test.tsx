import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

// LobbyNav est un composant serveur pur (marque + liens + CTA) : depuis le
// retrait du sélecteur de thème sur la landing, plus aucun hook client ni session.
import LobbyNav from '@/components/home-lobby/LobbyNav';

describe('LobbyNav', () => {
  it('lie la marque à / et les liens aux vraies routes', () => {
    render(<LobbyNav />);
    expect(screen.getByRole('link', { name: /accueil libre/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Manifesto' })).toHaveAttribute('href', '/manifesto');
    expect(screen.getByRole('link', { name: 'Se connecter' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Créer un compte' })).toHaveAttribute('href', '/register');
  });

  it('n’expose aucun sélecteur de thème (les invités voient le thème par défaut du site)', () => {
    render(<LobbyNav />);
    expect(screen.queryByRole('button', { name: /thème et apparence/i })).toBeNull();
  });

  it('marque la nav comme repère de navigation', () => {
    render(<LobbyNav />);
    expect(screen.getByRole('navigation', { name: /navigation principale/i })).toBeInTheDocument();
  });
});
