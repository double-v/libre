/**
 * PhotoMetadataPanel (#441) — rattrapage des métadonnées vu de l'admin.
 *
 * Un clic enchaîne les lots jusqu'au dernier (curseur null) et affiche le
 * cumul : l'admin n'a pas à relancer à la main lot après lot.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const { default: PhotoMetadataPanel } = await import('../PhotoMetadataPanel');

afterEach(() => vi.unstubAllGlobals());

describe('<PhotoMetadataPanel />', () => {
  it('enchaîne les lots jusqu’au curseur null et affiche le cumul', async () => {
    const lots = [
      { profils: 5, nettoyees: 3, propres: 4, erreurs: 0, curseur: 'u5' },
      { profils: 2, nettoyees: 1, propres: 1, erreurs: 1, curseur: null },
    ];
    const corps: unknown[] = [];
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
      if (url !== '/api/admin/photos/metadonnees' || init?.method !== 'POST') return Promise.reject(new Error(url));
      corps.push(JSON.parse(String(init.body)));
      return Promise.resolve({ ok: true, json: async () => lots.shift() } as Response);
    }));

    render(<PhotoMetadataPanel />);
    fireEvent.click(screen.getByRole('button', { name: /nettoyer/i }));

    expect(await screen.findByText(/terminé/i)).toBeInTheDocument();
    expect(corps).toEqual([{ curseur: null }, { curseur: 'u5' }]);
    const bilan = screen.getByRole('status');
    expect(bilan).toHaveTextContent('7 profils');
    expect(bilan).toHaveTextContent('4 photos nettoyées');
    expect(bilan).toHaveTextContent('5 déjà propres');
    expect(bilan).toHaveTextContent('1 en échec');
  });

  it('une erreur serveur arrête l’enchaînement et le dit', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 500 } as Response)));
    render(<PhotoMetadataPanel />);
    fireEvent.click(screen.getByRole('button', { name: /nettoyer/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/interrompu/i);
    expect(screen.getByRole('button', { name: /nettoyer/i })).not.toBeDisabled();
  });
});
