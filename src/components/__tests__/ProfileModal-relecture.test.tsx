/**
 * Tests — relecture de la fiche après une réponse sur place (revue PR #466).
 *
 * Réseau simulé où la relecture de la première fiche est **retenue** pendant
 * qu'on en ouvre une autre : la réponse tardive ne doit pas remplacer la
 * fiche désormais affichée.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import ProfileModal from '../ProfileModal';

afterEach(() => vi.unstubAllGlobals());

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const fiche = (id: string, nom: string) => ({
  id, displayName: nom, isVerified: false, lastActive: new Date().toISOString(), photos: [], veiledPhotos: [],
  answers: [{ key: 'chanson', label: 'Une chanson', format: 'ouverte', veiled: true }],
});

describe('<ProfileModal /> — relecture après réponse', () => {
  it('une relecture tardive de la fiche précédente ne remplace pas celle affichée', async () => {
    let relecturesA = 0;
    let libererRelectureA!: () => void;
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') return new Response(JSON.stringify({ answer: { key: 'chanson', label: '', format: 'ouverte', choices: [], text: 'x' } }));
      if (url === `/api/users/${A}`) {
        relecturesA += 1;
        if (relecturesA === 1) return new Response(JSON.stringify(fiche(A, 'Noor')));
        return new Promise<Response>((r) => { libererRelectureA = () => r(new Response(JSON.stringify(fiche(A, 'Noor')))); });
      }
      if (url === `/api/users/${B}`) return new Response(JSON.stringify(fiche(B, 'Sam')));
      return new Response('{}');
    }));

    const { rerender } = render(<ProfileModal userId={A} open onClose={vi.fn()} />);
    expect(await screen.findByRole('heading', { name: 'Noor' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Répondre à cette question' }));
    fireEvent.change(screen.getByLabelText('Ta réponse'), { target: { value: 'Barbara.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer et voir sa réponse' }));
    await waitFor(() => expect(relecturesA).toBe(2));

    rerender(<ProfileModal userId={B} open onClose={vi.fn()} />);
    expect(await screen.findByRole('heading', { name: 'Sam' })).toBeInTheDocument();
    await act(async () => { libererRelectureA(); });
    expect(screen.getByRole('heading', { name: 'Sam' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Noor' })).toBeNull();
  });
});
