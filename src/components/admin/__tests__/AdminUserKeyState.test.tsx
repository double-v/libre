/**
 * #341 — « Clé de messagerie » sur la fiche admin d'un compte.
 *
 * Rien n'est chargé au montage : la consultation est journalisée côté
 * serveur, elle se déclenche donc sur un geste explicite. Le diagnostic doit
 * se lire d'un coup d'œil, et un compte irrécupérable se distinguer.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminUserKeyState from '../AdminUserKeyState';

function mockFetch(status: number, body: unknown = {}) {
  const fn = vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });
  vi.stubGlobal('fetch', fn);
  return fn;
}

beforeEach(() => vi.clearAllMocks());

describe('AdminUserKeyState', () => {
  it('ne consulte rien au montage — la consultation est un acte journalisé', () => {
    const fetch = mockFetch(200);
    render(<AdminUserKeyState userId="u1" />);
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /vérifier la clé/i })).toBeInTheDocument();
  });

  it('montre « perdue » d’un coup d’œil, avec la conduite à tenir', async () => {
    const fetch = mockFetch(200, {
      diagnostic: 'perdue',
      keyCreatedAt: '2026-06-01T00:00:00.000Z',
      coffreGarni: false,
      escrowedAt: null,
      reinitialisations: 0,
      derniereReinitialisation: null,
    });
    render(<AdminUserKeyState userId="u1" />);
    await userEvent.setup().click(screen.getByRole('button', { name: /vérifier la clé/i }));

    expect(await screen.findByText(/^perdue/i)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith('/api/admin/users/u1/cle');
    expect(screen.getByText(/coffre vide/i)).toBeInTheDocument();
    expect(screen.getByText(/01\/06\/2026/)).toBeInTheDocument();
  });

  it('montre « récupérable » et le nombre de réinitialisations', async () => {
    mockFetch(200, {
      diagnostic: 'recuperable',
      keyCreatedAt: '2026-09-20T10:00:00.000Z',
      coffreGarni: true,
      escrowedAt: '2026-09-20T10:00:00.000Z',
      reinitialisations: 1,
      derniereReinitialisation: '2026-09-20T10:00:00.000Z',
    });
    render(<AdminUserKeyState userId="u1" />);
    await userEvent.setup().click(screen.getByRole('button', { name: /vérifier la clé/i }));
    expect(await screen.findByText(/récupérable/i)).toBeInTheDocument();
    expect(screen.getByText(/1 réinitialisation/)).toBeInTheDocument();
  });

  it('dit l’échec au lieu d’un état vide', async () => {
    mockFetch(500);
    render(<AdminUserKeyState userId="u1" />);
    await userEvent.setup().click(screen.getByRole('button', { name: /vérifier la clé/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/impossible/i);
  });
});
