import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdminIndicesFiabilite, NiveauFiabiliteTag } from '../AdminFiabilite';

describe('<AdminIndicesFiabilite /> (spec 010, US3)', () => {
  it('affiche le niveau, chaque indice et la mention « peut être légitime » sur le contexte', () => {
    render(
      <AdminIndicesFiabilite
        niveau="douteux"
        invitation={{ depuis: '2026-10-05T10:00:00Z' }}
        indices={[
          { type: 'likes_rafale', force: 'fort', date: '2026-10-05T10:00:00Z', extrait: null, autreUserId: null, legitimePossible: false },
          { type: 'appareil_partage', force: 'faible', date: '2026-10-04T10:00:00Z', extrait: null, autreUserId: 'u-2', legitimePossible: true },
        ]}
      />,
    );
    expect(screen.getByText('Douteux')).toBeInTheDocument();
    expect(screen.getByText('Likes en rafale juste après l’inscription')).toBeInTheDocument();
    expect(screen.getByText(/Peut être légitime : appareil de couple ou de famille/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir l’autre compte' })).toHaveAttribute('href', '/admin/users/u-2');
    expect(screen.getByText(/Invité à se faire vérifier/)).toBeInTheDocument();
  });

  it('sans indice, le dit en clair', () => {
    render(<AdminIndicesFiabilite niveau="fiable" invitation={null} indices={[]} />);
    expect(screen.getByText(/Aucun indice en attente/)).toBeInTheDocument();
  });

  it('chaque niveau a son libellé', () => {
    for (const [n, l] of [['fiable', 'Fiable'], ['a_surveiller', 'À surveiller'], ['douteux', 'Douteux']] as const) {
      const { unmount } = render(<NiveauFiabiliteTag niveau={n} />);
      expect(screen.getByText(l)).toBeInTheDocument();
      unmount();
    }
  });
});
