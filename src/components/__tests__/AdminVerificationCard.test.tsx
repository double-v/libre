/**
 * #436 — carte de demande de badge dans la file admin : le selfie se juge à
 * côté du geste et des photos du profil ; valider attend les deux constats,
 * refuser attend un motif.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminVerificationCard, { type VerificationRow } from '../AdminVerificationCard';

const demande = (over: Partial<VerificationRow> = {}): VerificationRow => ({
  id: 'v1',
  selfieUrl: '/api/photos/u1%2Fverif%2Fs.jpg',
  status: 'pending',
  createdAt: '2026-09-24T10:00:00Z',
  geste: 'Pouce levé, sous ton menton',
  motif: null,
  tentatives: 2,
  user: { id: 'u1', displayName: 'Camille', emailMasque: 'ca***@ex***.org', photos: ['/api/photos/u1%2Fa.jpg', '/api/photos/u1%2Fb.jpg'] },
  ...over,
});

describe('AdminVerificationCard', () => {
  it('propose la recherche inversée sur les photos du profil, jamais sur le selfie (#442)', () => {
    render(<AdminVerificationCard v={demande()} onDecision={vi.fn()} />);
    const lens = screen.getAllByRole('link', { name: 'Google Lens', hidden: true });
    expect(lens.map((a) => new URL(a.getAttribute('href')!, 'http://x').searchParams.get('cle'))).toEqual(['u1/a.jpg', 'u1/b.jpg']);
  });

  it('montre selfie, geste et photos du profil côte à côte', () => {
    render(<AdminVerificationCard v={demande()} onDecision={vi.fn()} />);
    expect(screen.getByAltText('Selfie de vérification de Camille')).toHaveAttribute('src', '/api/photos/u1%2Fverif%2Fs.jpg');
    expect(screen.getByText('Pouce levé, sous ton menton')).toBeInTheDocument();
    expect(screen.getAllByAltText(/Photo \d du profil/)).toHaveLength(2);
    expect(screen.getByText(/2 tentatives au total/)).toBeInTheDocument();
  });

  it('« Valider » n’est actif qu’avec les deux constats cochés', async () => {
    const onDecision = vi.fn(async () => {});
    render(<AdminVerificationCard v={demande()} onDecision={onDecision} />);
    const valider = screen.getByRole('button', { name: 'Valider' });
    expect(valider).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Le geste demandé est visible'));
    expect(valider).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Même personne que sur les photos'));
    fireEvent.click(valider);
    await waitFor(() => expect(onDecision).toHaveBeenCalledWith({ action: 'APPROVE_VERIFICATION' }));
  });

  it('« Refuser » n’est actif qu’avec un motif, et l’envoie', async () => {
    const onDecision = vi.fn(async () => {});
    render(<AdminVerificationCard v={demande()} onDecision={onDecision} />);
    const refuser = screen.getByRole('button', { name: 'Refuser' });
    expect(refuser).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Motif de refus'), { target: { value: 'photo_ecran' } });
    fireEvent.click(refuser);
    await waitFor(() => expect(onDecision).toHaveBeenCalledWith({ action: 'REJECT_VERIFICATION', motif: 'photo_ecran' }));
  });

  it('une demande tranchée n’a plus d’actions, et un refus rappelle son motif', () => {
    render(<AdminVerificationCard v={demande({ status: 'rejected', motif: 'Ton visage n’est pas assez visible.' })} onDecision={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Valider' })).not.toBeInTheDocument();
    expect(screen.getByText(/Ton visage n’est pas assez visible/)).toBeInTheDocument();
  });

  it('une demande antérieure aux gestes le dit', () => {
    render(<AdminVerificationCard v={demande({ geste: null })} onDecision={vi.fn()} />);
    expect(screen.getByText('Aucun (demande antérieure aux gestes)')).toBeInTheDocument();
  });
});
