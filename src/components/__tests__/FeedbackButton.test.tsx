/**
 * Formulaire de retour : rappel de la FAQ (#476) et annonce de la réponse
 * (#477) — dans « Mes retours » pour une personne connectée, impossible sans
 * compte, où le retour reste anonyme.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockUseSession = vi.fn();
vi.mock('next-auth/react', () => ({ useSession: () => mockUseSession() }));

const { default: FeedbackButton } = await import('../FeedbackButton');

function ouvrir() {
  render(<FeedbackButton />);
  fireEvent.click(screen.getByRole('button', { name: /Signaler un problème/i }));
}

beforeEach(() => {
  vi.restoreAllMocks();
  mockUseSession.mockReturnValue({ status: 'authenticated', data: { user: { id: 'u-1' } } });
});

describe('<FeedbackButton />', () => {
  it('rappelle que la FAQ existe, dès l’ouverture du formulaire', () => {
    ouvrir();
    expect(screen.getByRole('link', { name: /foire aux questions/i })).toHaveAttribute('href', '/faq');
  });

  it('connecté·e : annonce que la réponse arrivera dans « Mes retours »', () => {
    ouvrir();
    expect(screen.getByText(/l’équipe te l’écrira dans Paramètres, rubrique « Mes retours »/)).toBeInTheDocument();
  });

  it('sans compte : prévient qu’on ne pourra pas répondre', () => {
    mockUseSession.mockReturnValue({ status: 'unauthenticated', data: null });
    ouvrir();
    expect(screen.getByText(/nous ne pourrons pas te répondre/)).toBeInTheDocument();
  });

  it('après l’envoi, connecté·e : lien vers Mes retours', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ id: 'f-1' }), { status: 201 }));
    ouvrir();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Je ne vois aucun profil.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    await waitFor(() => expect(screen.getByText('Merci pour ton retour.')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'Mes retours' })).toHaveAttribute('href', '/settings/retours');
  });
});
