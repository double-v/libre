import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LobbySteps from '@/components/home-lobby/LobbySteps';

describe('LobbySteps', () => {
  it('rend le panneau « Comment ça marche » avec 3 étapes ordonnées', () => {
    render(<LobbySteps />);
    expect(screen.getByRole('heading', { name: 'Comment ça marche' })).toBeInTheDocument();

    const list = screen.getByRole('list');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);

    expect(screen.getByText('Crée ton profil')).toBeInTheDocument();
    expect(screen.getByText('Discute librement')).toBeInTheDocument();
    expect(screen.getByText('Rencontre pour de vrai')).toBeInTheDocument();
    // ton « tu » on-brand + garde-fous (gratuit, pas de score)
    expect(screen.getByText(/sans carte bleue/)).toBeInTheDocument();
    expect(screen.getByText(/sans score ni classement/)).toBeInTheDocument();
  });
});
