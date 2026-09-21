/**
 * RetentionPanel / RetentionAlert (#427) — la purge vue de l'admin.
 *
 * Le panneau dit quand la purge a tourné, ce qu'elle a fait règle par règle,
 * et permet de la lancer. L'alerte du tableau de bord ne s'affiche que si
 * elle est en retard (48 h sans passage) : c'est le seul signal quand le
 * trafic ne l'a pas déclenchée.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { default: RetentionPanel } = await import('../RetentionPanel');
const { default: RetentionAlert } = await import('../RetentionAlert');

const regles = [
  { id: 'encounters', donnees: 'Croisements', duree: '90 jours' },
  { id: 'reports', donnees: 'Signalements', duree: 'résolution + 1 an' },
];
let posts = 0;
function stubFetch(etat: Record<string, unknown>) {
  posts = 0;
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
    if (url !== '/api/admin/retention') return Promise.reject(new Error(url));
    if (init?.method === 'POST') {
      posts += 1;
      return Promise.resolve({ ok: true, json: async () => ({ ...etat, lastRunAt: new Date().toISOString(), enRetard: false, lastReport: { encounters: 7, reports: 0 } }) } as Response);
    }
    return Promise.resolve({ ok: true, json: async () => etat } as Response);
  }));
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe('<RetentionPanel />', () => {
  it('jamais tournée : le dit, en retard, et le bouton lance la purge puis affiche le bilan', async () => {
    stubFetch({ lastRunAt: null, lastReport: null, enRetard: true, regles });
    render(<RetentionPanel />);
    expect(await screen.findByText(/jamais tourné/i)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/en retard/i);
    fireEvent.click(screen.getByRole('button', { name: /Lancer la purge maintenant/ }));
    await waitFor(() => expect(posts).toBe(1));
    expect(await screen.findByText('7')).toBeInTheDocument();
    expect(screen.queryByText(/en retard/i)).toBeNull();
  });

  it('bilan avec une règle en échec : l’erreur est lisible sur sa ligne', async () => {
    stubFetch({ lastRunAt: new Date().toISOString(), lastReport: { encounters: 2, reports: { erreur: 'boom' } }, enRetard: false, regles });
    render(<RetentionPanel />);
    const ligne = (await screen.findByText('Signalements')).closest('tr')!;
    expect(ligne).toHaveTextContent('boom');
  });

  it('liste chaque règle avec sa durée', async () => {
    stubFetch({ lastRunAt: null, lastReport: null, enRetard: true, regles });
    render(<RetentionPanel />);
    expect(await screen.findByText('Croisements')).toBeInTheDocument();
    expect(screen.getByText('90 jours')).toBeInTheDocument();
  });
});

describe('<RetentionAlert />', () => {
  it('silencieuse quand la purge est à jour', async () => {
    stubFetch({ lastRunAt: new Date().toISOString(), lastReport: {}, enRetard: false, regles });
    render(<RetentionAlert />);
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('en retard : une alerte qui mène à la page', async () => {
    stubFetch({ lastRunAt: null, lastReport: null, enRetard: true, regles });
    render(<RetentionAlert />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/purge de rétention/i);
    expect(screen.getByRole('link', { name: /Voir/ })).toHaveAttribute('href', '/admin/retention');
  });
});
