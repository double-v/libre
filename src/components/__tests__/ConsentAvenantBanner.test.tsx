/**
 * ConsentAvenantBanner — l'avenant pour les retardataires (#425).
 *
 * Un compte inscrit avant la case porte déjà orientation ou pratiques sans
 * consentement art. 9. Le bandeau propose le choix qu'il n'a pas eu :
 * accepter, ou faire effacer ces informations (en deux temps). Il se ferme
 * pour la session seulement — il revient tant que rien n'est tranché, parce
 * que les données, elles, restent traitées entre-temps.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const toast = vi.fn();
vi.mock('@/lib/toast', () => ({ toast: (...a: unknown[]) => toast(...a) }));

const { default: ConsentAvenantBanner, AVENANT_SESSION_KEY } = await import('../ConsentAvenantBanner');

const calls: string[] = [];
function stubFetch(aRegulariser: boolean) {
  calls.length = 0;
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
    if (url !== '/api/users/consent') return Promise.reject(new Error(`inattendu : ${url}`));
    const method = init?.method ?? 'GET';
    calls.push(method);
    if (method === 'GET') return Promise.resolve({ ok: true, json: async () => ({ sensitiveData: !aRegulariser, aRegulariser }) } as Response);
    return Promise.resolve({ ok: true, json: async () => ({ sensitiveData: method === 'POST' }) } as Response);
  }));
}

beforeEach(() => { vi.clearAllMocks(); window.sessionStorage.clear(); });
afterEach(() => vi.unstubAllGlobals());

describe('<ConsentAvenantBanner />', () => {
  it('reste invisible quand il n’y a rien à régulariser', async () => {
    stubFetch(false);
    render(<ConsentAvenantBanner />);
    await waitFor(() => expect(calls).toContain('GET'));
    expect(screen.queryByText(/Avenant/)).toBeNull();
  });

  it('« J’accepte » enregistre le consentement et retire le bandeau', async () => {
    stubFetch(true);
    render(<ConsentAvenantBanner />);
    fireEvent.click(await screen.findByRole('button', { name: 'J’accepte' }));
    await waitFor(() => expect(calls).toContain('POST'));
    expect(toast).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText(/Avenant/)).toBeNull());
  });

  it('« Non, effacer » demande confirmation, puis efface', async () => {
    stubFetch(true);
    render(<ConsentAvenantBanner />);
    fireEvent.click(await screen.findByRole('button', { name: /Non, effacer/ }));
    expect(calls).not.toContain('DELETE');
    fireEvent.click(screen.getByRole('button', { name: /Confirmer l’effacement/ }));
    await waitFor(() => expect(calls).toContain('DELETE'));
    await waitFor(() => expect(screen.queryByText(/Avenant/)).toBeNull());
  });

  it('fermer ne vaut que pour la session : rien n’est envoyé, et il revient sans la clé', async () => {
    stubFetch(true);
    const { unmount } = render(<ConsentAvenantBanner />);
    fireEvent.click(await screen.findByRole('button', { name: /Fermer/ }));
    expect(screen.queryByText(/Avenant/)).toBeNull();
    expect(calls.filter((m) => m !== 'GET')).toEqual([]);
    expect(window.sessionStorage.getItem(AVENANT_SESSION_KEY)).toBe('1');
    unmount();
    window.sessionStorage.clear();
    render(<ConsentAvenantBanner />);
    expect(await screen.findByText(/Avenant/)).toBeInTheDocument();
  });

  it('mène à la politique de confidentialité', async () => {
    stubFetch(true);
    render(<ConsentAvenantBanner />);
    expect(await screen.findByRole('link', { name: /En savoir plus/ })).toHaveAttribute('href', '/confidentialite');
  });
});
