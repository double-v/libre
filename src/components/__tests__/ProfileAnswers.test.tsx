/**
 * Tests — section « Mes questions » du profil (spec 009, US1).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProfileAnswers from '../ProfileAnswers';

afterEach(() => vi.unstubAllGlobals());

function stub(answers: unknown[]) {
  const f = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'DELETE') return new Response(null, { status: 204 });
    return new Response(JSON.stringify({ answers }), { status: 200 });
  });
  vi.stubGlobal('fetch', f);
  return f;
}

describe('<ProfileAnswers />', () => {
  it('propose les deux entrées ludiques et les thèmes, en phrases complètes', async () => {
    stub([]);
    render(<ProfileAnswers />);
    expect(screen.getByRole('button', { name: /Répondre aux questions une par une/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Jouer à « Ceci ou cela »/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rire & légèreté' })).toBeInTheDocument();
  });

  it('affiche mes réponses : pastilles en clair, texte, et mes choix « Ceci ou cela »', async () => {
    stub([
      { key: 'cafe-the', label: '', format: 'choix', choices: ['the', 'tisane'], text: 'Vert.' },
      { key: 'mer-montagne', label: '', format: 'ceci-ou-cela', choices: ['mer'], text: '' },
    ]);
    render(<ProfileAnswers />);
    expect(await screen.findByText('Thé')).toBeInTheDocument();
    expect(screen.getByText('Tisane')).toBeInTheDocument();
    expect(screen.getByText('Vert.')).toBeInTheDocument();
    expect(screen.getByText('Mer')).toBeInTheDocument();
  });

  it('dit sobrement qu’une réponse a été retirée par la modération', async () => {
    stub([{ key: 'fait-rire', label: '', format: 'ouverte', choices: [], text: 'x', status: 'removed' }]);
    render(<ProfileAnswers />);
    expect(await screen.findByText('Cette réponse a été retirée par la modération. Tu peux en écrire une autre.')).toBeInTheDocument();
    expect(screen.queryByText('x')).toBeNull();
  });

  it('retire une réponse', async () => {
    const f = stub([{ key: 'fait-rire', label: '', format: 'ouverte', choices: [], text: 'Les chats.' }]);
    render(<ProfileAnswers />);
    fireEvent.click(await screen.findByRole('button', { name: 'Retirer ma réponse' }));
    expect(await screen.findByRole('button', { name: /Répondre aux questions une par une/ })).toBeInTheDocument();
    expect(f).toHaveBeenCalledWith('/api/users/me/answers?key=fait-rire', { method: 'DELETE' });
  });

  it('ouvre « une par une » sur un thème, avec « Passer cette question »', async () => {
    stub([]);
    render(<ProfileAnswers />);
    fireEvent.click(screen.getByRole('button', { name: 'Rire & légèreté' }));
    expect(screen.getByText('Rire & légèreté')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Qu’est-ce qui te fait rire à coup sûr');
    fireEvent.click(screen.getByRole('button', { name: 'Passer cette question' }));
    expect(screen.getByRole('heading', { level: 3 })).not.toHaveTextContent('Qu’est-ce qui te fait rire à coup sûr');
    fireEvent.click(screen.getByRole('button', { name: 'Arrêter pour le moment' }));
    expect(screen.getByRole('button', { name: /Jouer à « Ceci ou cela »/ })).toBeInTheDocument();
  });
});
