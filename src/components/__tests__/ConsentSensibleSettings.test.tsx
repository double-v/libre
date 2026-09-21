/**
 * ConsentSensibleSettings — « Données sensibles » dans Paramètres (#425).
 *
 * Le retrait efface l'orientation, le genre, les pratiques et les personnes
 * cherchées : il se confirme en deux temps, sur place, et ne passe jamais par
 * un switch (un switch se bascule par réflexe ; un effacement se décide).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const toast = vi.fn();
vi.mock('@/lib/toast', () => ({ toast: (...a: unknown[]) => toast(...a) }));

const { default: ConsentSensibleSettings } = await import('../ConsentSensibleSettings');

let deletes = 0;
function stubFetch(active: boolean) {
  deletes = 0;
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
    if (url === '/api/users/consent' && init?.method === 'DELETE') {
      deletes += 1;
      return Promise.resolve({ ok: true, json: async () => ({ sensitiveData: false }) } as Response);
    }
    if (url === '/api/users/consent') {
      return Promise.resolve({ ok: true, json: async () => ({ sensitiveData: active }) } as Response);
    }
    return Promise.reject(new Error(`inattendu : ${url}`));
  }));
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe('<ConsentSensibleSettings />', () => {
  it('consentement actif : retirer demande confirmation, puis efface et le dit', async () => {
    stubFetch(true);
    render(<ConsentSensibleSettings />);
    const retirer = await screen.findByRole('button', { name: /Retirer mon consentement/ });
    fireEvent.click(retirer);
    expect(deletes).toBe(0);
    expect(screen.getByText(/seront effacés/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Confirmer l’effacement/ }));
    await waitFor(() => expect(deletes).toBe(1));
    expect(toast).toHaveBeenCalled();
    expect(await screen.findByText(/pas encore donné/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Retirer mon consentement/ })).toBeNull();
  });

  it('annuler la confirmation ne touche à rien', async () => {
    stubFetch(true);
    render(<ConsentSensibleSettings />);
    fireEvent.click(await screen.findByRole('button', { name: /Retirer mon consentement/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(deletes).toBe(0);
    expect(screen.getByRole('button', { name: /Retirer mon consentement/ })).toBeInTheDocument();
  });

  it('sans consentement : explique où il sera proposé, sans bouton', async () => {
    stubFetch(false);
    render(<ConsentSensibleSettings />);
    expect(await screen.findByText(/pas encore donné/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
