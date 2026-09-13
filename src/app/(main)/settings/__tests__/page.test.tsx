/**
 * Tests — page /settings, suppression de compte.
 *
 * Non-régression du retour terrain « ça ne supprime rien » : la page appelait
 * `fetch('/api/users/me', { method: 'DELETE' })` sans corps, alors que la route
 * exige la confirmation du mot de passe. Le 400 qui revenait était avalé dans un
 * « Erreur lors de la suppression du compte » sans plus d'explication.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import SettingsPage from '../page';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
}));

const mockSignOut = vi.fn().mockResolvedValue(undefined);
vi.mock('next-auth/react', () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

vi.mock('@/components/AppearanceSettings', () => ({
  __esModule: true,
  default: () => null,
}));

function jsonRes(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

let fetchSpy: ReturnType<typeof vi.fn>;
let deleteCall: { url: string; init?: RequestInit } | null;

function stubFetch({ hasPassword = true, deleteStatus = 204, deleteBody = {} } = {}) {
  deleteCall = null;
  fetchSpy = vi.fn((url: string, init?: RequestInit) => {
    if (url === '/api/users/profile')
      return jsonRes({ profile: { userId: 'u1', invisibleMode: false }, isVerified: false });
    if (url === '/api/users/me' && init?.method === 'DELETE') {
      deleteCall = { url, init };
      return jsonRes(deleteBody, deleteStatus);
    }
    if (url === '/api/users/me') return jsonRes({ hasPassword });
    return jsonRes({});
  });
  vi.stubGlobal('fetch', fetchSpy);
}

async function openDeleteForm() {
  render(<SettingsPage />);
  const trigger = await screen.findByRole('button', { name: 'Supprimer mon compte' });
  fireEvent.click(trigger);
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('<SettingsPage /> — suppression de compte', () => {
  it('envoie le mot de passe de confirmation dans le corps du DELETE', async () => {
    stubFetch();
    await openDeleteForm();

    const field = await screen.findByLabelText(/Confirmez avec votre mot de passe/);
    fireEvent.change(field, { target: { value: 'Motdepasse1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Oui, supprimer' }));

    await waitFor(() => expect(deleteCall).not.toBeNull());
    expect(JSON.parse(String(deleteCall!.init!.body))).toEqual({
      confirmPassword: 'Motdepasse1',
    });
  });

  it('déconnecte et renvoie à l\'accueil une fois le compte supprimé', async () => {
    stubFetch();
    await openDeleteForm();

    fireEvent.change(await screen.findByLabelText(/Confirmez avec votre mot de passe/), {
      target: { value: 'Motdepasse1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Oui, supprimer' }));

    await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('affiche le motif renvoyé par le serveur au lieu d\'un message générique', async () => {
    stubFetch({ deleteStatus: 403, deleteBody: { error: 'Mot de passe incorrect' } });
    await openDeleteForm();

    fireEvent.change(await screen.findByLabelText(/Confirmez avec votre mot de passe/), {
      target: { value: 'mauvais' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Oui, supprimer' }));

    expect(await screen.findByText('Mot de passe incorrect')).toBeInTheDocument();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('ne demande pas de mot de passe à un compte sans mot de passe', async () => {
    stubFetch({ hasPassword: false });
    await openDeleteForm();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Oui, supprimer' })).toBeInTheDocument(),
    );
    expect(screen.queryByLabelText(/Confirmez avec votre mot de passe/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Oui, supprimer' }));
    await waitFor(() => expect(deleteCall).not.toBeNull());
  });
});
