import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminProfilCard, { type ProfilRow } from '../AdminProfilCard';

const p: ProfilRow = {
  userId: 'u1',
  displayName: 'Noor',
  email: 'no***@ex***.test',
  inscritLe: '2026-09-17T00:00:00Z',
  enRetrait: false,
  bio: 'Salut',
  photos: ['/api/photos/u1%2Fp2.jpg'],
  derniereDecision: null,
  signaux: [{ type: 'contact_photo', force: 'fort', extrait: 'telegram : @lola', photo: '/api/photos/u1%2Fp2.jpg', createdAt: '2026-09-25T00:00:00Z', nouveau: true }],
};

describe('<AdminProfilCard /> (#444)', () => {
  it('dit pourquoi le profil est là et repère la photo lue', () => {
    render(<AdminProfilCard p={p} onDecision={vi.fn()} />);
    expect(screen.getByText('Indice fort')).toBeInTheDocument();
    expect(screen.getByText('Texte lu sur une photo')).toBeInTheDocument();
    expect(screen.getByText('« telegram : @lola »')).toBeInTheDocument();
    expect(screen.getByText('Texte lu ici')).toBeInTheDocument();
  });

  it('« Bannir » demande une confirmation avant de décider', async () => {
    const onDecision = vi.fn(async () => {});
    render(<AdminProfilCard p={p} onDecision={onDecision} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bannir' }));
    expect(onDecision).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le bannissement' }));
    expect(onDecision).toHaveBeenCalledWith('banni');
  });

  it('« Demander une vérification » est inactif sur un profil déjà en retrait', () => {
    render(<AdminProfilCard p={{ ...p, enRetrait: true }} onDecision={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Demander une vérification' })).toBeDisabled();
  });
});
