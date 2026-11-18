/**
 * #436 — Paramètres › Vérification : quatre états, et le bouton mène à /verify.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VerificationSettings from '../VerificationSettings';
import type { StatutVerification } from '@/lib/verification/client';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const avec = (valeur: StatutVerification) => vi.fn(async () => ({ ok: true as const, valeur }));

describe('VerificationSettings', () => {
  it('aucune demande : « Obtenir le badge » mène à /verify', async () => {
    render(<VerificationSettings charger={avec({ statut: 'aucune' })} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Obtenir le badge' }));
    expect(push).toHaveBeenCalledWith('/verify');
  });

  it('en cours : pas de bouton', async () => {
    render(<VerificationSettings charger={avec({ statut: 'en_cours' })} />);
    expect(await screen.findByText('En cours')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('validé : le dit, sans bouton', async () => {
    render(<VerificationSettings charger={avec({ statut: 'validee' })} />);
    expect(await screen.findByText('Ton profil est vérifié')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('refusé : le motif et « Refaire mon selfie », qui mène à /verify', async () => {
    render(<VerificationSettings charger={avec({
      statut: 'refusee', tentative: 2, nonVu: true,
      motif: { cle: 'visage', texte: 'Ton visage n’est pas assez visible.', conseil: 'Face à la lumière.' },
    })} />);
    expect(await screen.findByText('Ton visage n’est pas assez visible.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refaire mon selfie' }));
    expect(push).toHaveBeenLastCalledWith('/verify');
  });

  it('refusé trois fois : la date de reprise, sans bouton qui mènerait à une impasse', async () => {
    render(<VerificationSettings charger={avec({
      statut: 'refusee', tentative: 4, nonVu: false, reessaiAt: '2026-11-13T15:30:00.000Z',
      motif: { cle: 'code', texte: 'Le code n’est pas écrit à la main, pas lisible ou pas exact.', conseil: 'En gros.' },
    })} />);
    expect(await screen.findByText(/Tu pourras refaire ton selfie à partir du 13 novembre/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('tant que le statut n’est pas connu, aucun bouton', () => {
    render(<VerificationSettings charger={() => new Promise<never>(() => {})} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
