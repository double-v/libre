/**
 * Tests composant — CheckinButton.
 *
 * Vérifie :
 * 1. Fetch initial /api/circle/check-in/active → bouton "Activer" par défaut
 * 2. Fetch initial 200 + checkin actif → bandeau countdown + bouton "Je suis safe"
 * 3. Click "Activer" → modal s'ouvre avec les 5 durées
 * 4. Click sur une durée → POST start + bascule en état actif
 * 5. Click "Je suis safe" → POST validate + retour à l'état inactif
 * 6. Click "Annuler" + confirm → DELETE cancel + retour à l'état inactif
 * 7. Modal : ESC ferme
 * 8. Modal : click sur le backdrop ferme
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { CheckinButton } from '../CheckinButton';

describe('<CheckinButton />', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    confirmSpy.mockRestore();
  });

  it('fetch 204 → affiche le bouton "Activer"', async () => {
    fetchSpy.mockResolvedValueOnce({ status: 204, ok: false } as Response);
    render(<CheckinButton />);
    await waitFor(() => {
      expect(screen.getByText(/Activer un check-in/i)).toBeInTheDocument();
    });
  });

  it('fetch 200 + checkin actif → affiche le bandeau countdown + "Je suis safe"', async () => {
    const future = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    fetchSpy.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({
        id: 'ci-1',
        triggeredAt: new Date().toISOString(),
        expiresAt: future,
        secondsRemaining: 1800,
      }),
    } as Response);
    render(<CheckinButton />);
    await waitFor(() => {
      expect(screen.getByText(/Check-in actif/i)).toBeInTheDocument();
      expect(screen.getByText(/Je suis safe/i)).toBeInTheDocument();
    });
  });

  it('click "Activer" → ouvre la modal avec 5 choix de durée', async () => {
    fetchSpy.mockResolvedValueOnce({ status: 204, ok: false } as Response);
    render(<CheckinButton />);
    await waitFor(() => screen.getByText(/Activer un check-in/i));

    act(() => {
      fireEvent.click(screen.getByText(/Activer un check-in/i));
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('30 min')).toBeInTheDocument();
      expect(screen.getByText('1 h')).toBeInTheDocument();
      expect(screen.getByText('2 h')).toBeInTheDocument();
      expect(screen.getByText('4 h')).toBeInTheDocument();
      expect(screen.getByText('8 h')).toBeInTheDocument();
    });
  });

  it('click sur "1 h" → POST /api/circle/check-in + bascule en actif', async () => {
    fetchSpy
      .mockResolvedValueOnce({ status: 204, ok: false } as Response) // fetch initial
      .mockResolvedValueOnce({
        status: 201,
        ok: true,
        json: async () => ({
          id: 'ci-new',
          expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
          durationMinutes: 60,
        }),
      } as Response);

    render(<CheckinButton />);
    await waitFor(() => screen.getByText(/Activer un check-in/i));

    act(() => {
      fireEvent.click(screen.getByText(/Activer un check-in/i));
    });
    await waitFor(() => screen.getByText('1 h'));

    await act(async () => {
      fireEvent.click(screen.getByText('1 h'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Check-in actif/i)).toBeInTheDocument();
      expect(screen.getByText(/Je suis safe/i)).toBeInTheDocument();
    });
    // Vérifie le POST
    const postCall = fetchSpy.mock.calls.find((c) => (c[1] as RequestInit)?.method === 'POST');
    expect(postCall).toBeDefined();
    expect(JSON.parse((postCall![1] as RequestInit).body as string)).toEqual({
      durationMinutes: 60,
    });
  });

  it('click "Je suis safe" → POST validate + retour à l\'état inactif', async () => {
    fetchSpy
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          id: 'ci-1',
          triggeredAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 1000 * 60).toISOString(),
          secondsRemaining: 60,
        }),
      } as Response)
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({}) } as Response);

    render(<CheckinButton />);
    await waitFor(() => screen.getByText(/Je suis safe/i));

    await act(async () => {
      fireEvent.click(screen.getByText(/Je suis safe/i));
    });

    await waitFor(() => {
      expect(screen.queryByText(/Je suis safe/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Activer un check-in/i)).toBeInTheDocument();
    });
  });

  it('click "Annuler" + confirm → DELETE cancel + retour inactif', async () => {
    fetchSpy
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          id: 'ci-1',
          triggeredAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 1000 * 60).toISOString(),
          secondsRemaining: 60,
        }),
      } as Response)
      .mockResolvedValueOnce({ status: 204, ok: true, json: async () => ({}) } as Response);

    render(<CheckinButton />);
    await waitFor(() => screen.getByText('Annuler'));

    await act(async () => {
      fireEvent.click(screen.getByText('Annuler'));
    });

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled();
      expect(screen.getByText(/Activer un check-in/i)).toBeInTheDocument();
    });
    // Vérifie le DELETE
    const deleteCall = fetchSpy.mock.calls.find(
      (c) => (c[1] as RequestInit)?.method === 'DELETE',
    );
    expect(deleteCall).toBeDefined();
  });

  it('countdown : annonce SR à la granularité minute, pas à la seconde', async () => {
    fetchSpy.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({
        id: 'ci-1',
        triggeredAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1800 * 1000).toISOString(),
        secondsRemaining: 1800,
      }),
    } as Response);
    render(<CheckinButton />);

    // Le compteur visuel (mm:ss) ne doit PAS être annoncé en continu :
    // il est marqué aria-hidden, hors de l'arbre d'accessibilité.
    const visual = await screen.findByText(/restantes/i);
    expect(visual.closest('[aria-hidden="true"]')).not.toBeNull();

    // Une région live sr-only annonce le temps restant à la minute (≈ 30),
    // pas toutes les secondes (sinon spam pour les lecteurs d'écran).
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent(/30\s*minute/i);
  });

  it('modal : ESC ferme la modal', async () => {
    fetchSpy.mockResolvedValueOnce({ status: 204, ok: false } as Response);
    render(<CheckinButton />);
    await waitFor(() => screen.getByText(/Activer un check-in/i));

    act(() => {
      fireEvent.click(screen.getByText(/Activer un check-in/i));
    });
    await waitFor(() => screen.getByRole('dialog'));

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('modal : click sur le backdrop ferme la modal', async () => {
    fetchSpy.mockResolvedValueOnce({ status: 204, ok: false } as Response);
    render(<CheckinButton />);
    await waitFor(() => screen.getByText(/Activer un check-in/i));

    act(() => {
      fireEvent.click(screen.getByText(/Activer un check-in/i));
    });
    const dialog = await waitFor(() => screen.getByRole('dialog'));

    act(() => {
      fireEvent.click(dialog); // le dialog a un onClick onClose
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
