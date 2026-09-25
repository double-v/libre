/**
 * Tests — courses dans les parcours de réponse (revue de la PR #466).
 *
 * On reproduit la vraie situation : un enregistrement dont la réponse réseau
 * est **retenue**, un geste pendant l'attente, puis la réponse qui arrive.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import QuestionFlow from '../QuestionFlow';
import ThisOrThat from '../ThisOrThat';
import ProfileAnswers from '../ProfileAnswers';

afterEach(() => vi.unstubAllGlobals());

/** fetch dont chaque réponse attend qu'on la libère. */
function fetchRetenu() {
  const enAttente: Array<(r: Response) => void> = [];
  vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((resolve) => {
    const key = init?.body ? JSON.parse(String(init.body)).key : undefined;
    enAttente.push(() => resolve(new Response(JSON.stringify({ answer: { key, label: '', format: 'ouverte', choices: [], text: 'x' } }), { status: 200 })));
  })));
  return { liberer: async () => { await act(async () => { enAttente.shift()!(new Response()); }); } };
}

const titre = () => screen.getByRole('heading', { level: 3 }).textContent;

describe('« une par une » : passer pendant un enregistrement', () => {
  it('ne saute pas la question suivante et ne repropose pas celle qui vient d’être enregistrée', async () => {
    const net = fetchRetenu();
    render(<QuestionFlow theme="rire" answeredKeys={new Set()} onAnswered={vi.fn()} onStop={vi.fn()} />);
    const premiere = titre();
    fireEvent.change(screen.getByLabelText('Ta réponse'), { target: { value: 'Les chats.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer ma réponse' }));
    const passer = screen.getByRole('button', { name: 'Passer cette question' });
    expect(passer).toBeDisabled();
    fireEvent.click(passer);
    await net.liberer();
    expect(titre()).not.toBe(premiere);
    expect(titre()).toMatch(/qui t’a donné le sourire/);
  });
});

describe('« Ceci ou cela » : passer pendant un enregistrement', () => {
  it('enchaîne sur la paire qui suit celle choisie', async () => {
    const net = fetchRetenu();
    render(<ThisOrThat answeredKeys={new Set()} onAnswered={vi.fn()} onStop={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mer' }));
    const passer = screen.getByRole('button', { name: 'Passer cette question' });
    expect(passer).toBeDisabled();
    fireEvent.click(passer);
    await net.liberer();
    expect(screen.getByRole('group', { name: 'Chat ou chien' })).toBeInTheDocument();
  });
});

describe('profil : rien avant que mes réponses soient chargées', () => {
  it('garde les parcours fermés tant que le chargement n’a pas abouti', async () => {
    let liberer!: (r: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((r) => { liberer = r; })));
    render(<ProfileAnswers />);
    expect(screen.getByRole('button', { name: /Répondre aux questions une par une/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Jouer à « Ceci ou cela »/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Rire & légèreté' })).toBeDisabled();
    await act(async () => { liberer(new Response(JSON.stringify({ answers: [] }))); });
    expect(screen.getByRole('button', { name: /Répondre aux questions une par une/ })).toBeEnabled();
  });

  it('les garde fermés et le dit quand le chargement échoue', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })));
    render(<ProfileAnswers />);
    expect(await screen.findByText(/Impossible de charger tes réponses/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Jouer à « Ceci ou cela »/ })).toBeDisabled();
  });
});
