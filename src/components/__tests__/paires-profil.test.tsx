/**
 * Tests — mes choix « Ceci ou cela » se modifient et se retirent (revue PR #466).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProfileAnswers from '../ProfileAnswers';

afterEach(() => vi.unstubAllGlobals());

function reseau(answers: unknown[]) {
  const f = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'DELETE') return new Response(null, { status: 204 });
    if (init?.method === 'PUT') {
      const b = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ answer: { key: b.key, label: '', format: 'ceci-ou-cela', choices: b.choices, text: '' } }));
    }
    return new Response(JSON.stringify({ answers }));
  });
  vi.stubGlobal('fetch', f);
  return f;
}

describe('mes choix « Ceci ou cela »', () => {
  it('se changent pour l’autre option', async () => {
    const f = reseau([{ key: 'mer-montagne', label: '', format: 'ceci-ou-cela', choices: ['mer'], text: '' }]);
    render(<ProfileAnswers />);
    fireEvent.click(await screen.findByRole('button', { name: /Mer ou montagne : Mer/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Montagne' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer ma réponse' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Mer ou montagne : Montagne/ })).toBeInTheDocument());
    const put = f.mock.calls.find(([, i]) => (i as RequestInit | undefined)?.method === 'PUT')!;
    expect(JSON.parse(String((put[1] as RequestInit).body))).toEqual({ key: 'mer-montagne', choices: ['montagne'], text: '' });
  });

  it('se retirent', async () => {
    const f = reseau([{ key: 'mer-montagne', label: '', format: 'ceci-ou-cela', choices: ['mer'], text: '' }]);
    render(<ProfileAnswers />);
    fireEvent.click(await screen.findByRole('button', { name: /Mer ou montagne : Mer/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Retirer ma réponse' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /Mer ou montagne/ })).toBeNull());
    expect(f).toHaveBeenCalledWith('/api/users/me/answers?key=mer-montagne', { method: 'DELETE' });
  });

  it('disent sobrement quand la modération en a retiré un', async () => {
    reseau([{ key: 'mer-montagne', label: '', format: 'ceci-ou-cela', choices: ['mer'], text: '', status: 'removed' }]);
    render(<ProfileAnswers />);
    fireEvent.click(await screen.findByRole('button', { name: /Mer ou montagne/ }));
    expect(screen.getByText('Ce choix a été retiré par la modération. Tu peux en faire un autre.')).toBeInTheDocument();
  });
});
