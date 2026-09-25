/**
 * Tests — « Ceci ou cela » (spec 009, US4).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ThisOrThat from '../ThisOrThat';

afterEach(() => vi.unstubAllGlobals());

describe('<ThisOrThat />', () => {
  it('une paire à la fois ; choisir enregistre puis passe à la suivante', async () => {
    const f = vi.fn(async (_u: string, init?: RequestInit) =>
      new Response(JSON.stringify({ answer: { key: JSON.parse(String(init?.body)).key, format: 'ceci-ou-cela', label: '', choices: ['mer'], text: '' } }), { status: 200 }),
    );
    vi.stubGlobal('fetch', f);
    const onAnswered = vi.fn();
    render(<ThisOrThat answeredKeys={new Set()} onAnswered={onAnswered} onStop={vi.fn()} />);
    expect(screen.getByRole('group', { name: 'Mer ou montagne' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mer' }));
    await waitFor(() => expect(onAnswered).toHaveBeenCalled());
    expect(JSON.parse(String((f.mock.calls[0][1] as RequestInit).body))).toEqual({ key: 'mer-montagne', choices: ['mer'], text: '' });
    expect(await screen.findByRole('group', { name: 'Chat ou chien' })).toBeInTheDocument();
  });

  it('passer n’enregistre rien', () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    render(<ThisOrThat answeredKeys={new Set()} onAnswered={vi.fn()} onStop={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Passer cette question' }));
    expect(f).not.toHaveBeenCalled();
    expect(screen.getByRole('group', { name: 'Chat ou chien' })).toBeInTheDocument();
  });

  it('saute les paires déjà répondues et n’affiche aucun compteur', () => {
    vi.stubGlobal('fetch', vi.fn());
    const { container } = render(<ThisOrThat answeredKeys={new Set(['mer-montagne'])} onAnswered={vi.fn()} onStop={vi.fn()} />);
    expect(screen.getByRole('group', { name: 'Chat ou chien' })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\d/);
  });

  it('s’arrête quand on veut', () => {
    vi.stubGlobal('fetch', vi.fn());
    const onStop = vi.fn();
    render(<ThisOrThat answeredKeys={new Set()} onAnswered={vi.fn()} onStop={onStop} />);
    fireEvent.click(screen.getByRole('button', { name: 'Arrêter pour le moment' }));
    expect(onStop).toHaveBeenCalled();
  });
});
