/**
 * Tests — écran /pseudo (#459).
 *
 * Atteint quand la migration a retiré un pseudo hors règle. Non passable :
 * pas de « Plus tard ». Un pseudo valide enregistré renvoie vers Découvrir ;
 * un refus du serveur affiche son message.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn(), back: vi.fn() }),
}));

import PseudoPage from '../page';

function stubFetch({ mustRename, patch }: { mustRename: boolean; patch?: { status: number; body: unknown } }) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/users/profile') {
      return new Response(JSON.stringify({ profile: {}, displayName: 'Membre', mustRenameDisplayName: mustRename }));
    }
    if (url === '/api/users/me/pseudo' && init?.method === 'PATCH') {
      return new Response(JSON.stringify(patch?.body ?? {}), { status: patch?.status ?? 200 });
    }
    throw new Error(`inattendu : ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => mockReplace.mockReset());
afterEach(() => vi.unstubAllGlobals());

describe('/pseudo', () => {
  it('renvoie vers Découvrir quand aucun renommage n\'est dû', async () => {
    stubFetch({ mustRename: false });
    render(<PseudoPage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/discover'));
  });

  it('n\'offre aucune porte de sortie et désactive l\'envoi tant que le champ est vide', async () => {
    stubFetch({ mustRename: true });
    render(<PseudoPage />);
    await screen.findByRole('heading', { name: 'Choisis un nouveau pseudo' });
    expect(screen.queryByRole('button', { name: /plus tard/i })).toBeNull();
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
  });

  it('affiche le message du serveur quand le pseudo est refusé', async () => {
    stubFetch({ mustRename: true, patch: { status: 400, body: { error: 'Pas d’adresse e-mail, de lien ni de numéro dans un pseudo : il est visible par tout le monde.' } } });
    render(<PseudoPage />);
    fireEvent.change(await screen.findByLabelText('Pseudo'), { target: { value: 'a@b.fr' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText(/Pas d’adresse e-mail/)).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('enregistre puis renvoie vers Découvrir', async () => {
    const f = stubFetch({ mustRename: true, patch: { status: 200, body: { displayName: 'Camille' } } });
    render(<PseudoPage />);
    fireEvent.change(await screen.findByLabelText('Pseudo'), { target: { value: 'Camille' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/discover'));
    const patch = f.mock.calls.find(([u]) => u === '/api/users/me/pseudo');
    expect(JSON.parse(String(patch?.[1]?.body))).toEqual({ displayName: 'Camille' });
  });
});
