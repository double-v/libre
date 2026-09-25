/**
 * Tests — saisie d'une réponse selon le format (spec 009, FR-002b, FR-011).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AnswerInput from '../AnswerInput';
import { questionByKey } from '@/lib/questions';

afterEach(() => vi.unstubAllGlobals());

function stubPut(status = 200, body: unknown = { answer: { key: 'x' } }) {
  const f = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', f);
  return f;
}
const sent = (f: ReturnType<typeof stubPut>) => JSON.parse(String((f.mock.calls[0] as unknown[])[1] && ((f.mock.calls[0] as unknown[])[1] as RequestInit).body));

describe('<AnswerInput />', () => {
  it('choix unique : annonce une seule réponse, une pastille remplace l’autre', async () => {
    const f = stubPut();
    render(<AnswerInput question={questionByKey('matin-ou-soir')!} onSaved={vi.fn()} />);
    expect(screen.getByText('Choisis une réponse.')).toBeInTheDocument();
    const save = screen.getByRole('button', { name: 'Enregistrer ma réponse' });
    expect(save).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Le matin' }));
    fireEvent.click(screen.getByRole('button', { name: 'Le soir' }));
    expect(screen.getByRole('button', { name: 'Le matin' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Le soir' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(save);
    await waitFor(() => expect(f).toHaveBeenCalled());
    expect(sent(f)).toEqual({ key: 'matin-ou-soir', choices: ['le-soir'], text: '' });
  });

  it('choix multiple : annonce plusieurs réponses, l’option exclusive retire les autres', () => {
    stubPut();
    render(<AnswerInput question={questionByKey('cafe-the')!} onSaved={vi.fn()} />);
    expect(screen.getByText('Tu peux choisir plusieurs réponses.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thé' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tisane' }));
    expect(screen.getByRole('button', { name: 'Thé' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Tisane' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Aucun des quatre' }));
    expect(screen.getByRole('button', { name: 'Thé' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Café' }));
    expect(screen.getByRole('button', { name: 'Aucun des quatre' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('précision repliée jusqu’au choix, puis facultative', () => {
    stubPut();
    render(<AnswerInput question={questionByKey('cafe-the')!} onSaved={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Ajouter quelques mots (facultatif)' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Thé' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter quelques mots (facultatif)' }));
    expect(screen.getByLabelText('Si tu le souhaites, ajoute quelques mots à ta réponse.')).toBeInTheDocument();
  });

  it('question ouverte : texte requis, aide affichée pour « habitudes »', () => {
    stubPut();
    render(<AnswerInput question={questionByKey('habitudes')!} onSaved={vi.fn()} />);
    expect(screen.getByText(/café, de l’alcool, du tabac ou du CBD/)).toBeInTheDocument();
    const save = screen.getByRole('button', { name: 'Enregistrer ma réponse' });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Ta réponse'), { target: { value: 'Un café le matin.' } });
    expect(save).toBeEnabled();
  });

  it('relaie le refus du serveur sans perdre la saisie', async () => {
    stubPut(400, { error: 'Pas d’adresse e-mail, de lien ni de numéro dans une réponse : elle est visible par tout le monde.', motif: 'contact' });
    const onSaved = vi.fn();
    render(<AnswerInput question={questionByKey('fait-rire')!} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText('Ta réponse'), { target: { value: 'insta @cam' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer ma réponse' }));
    expect(await screen.findByText(/Pas d’adresse e-mail/)).toBeInTheDocument();
    expect(screen.getByLabelText('Ta réponse')).toHaveValue('insta @cam');
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('reprend une réponse existante pour la modifier', () => {
    stubPut();
    render(<AnswerInput question={questionByKey('cafe-the')!} initial={{ choices: ['the'], text: 'Vert.' }} onSaved={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Thé' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Si tu le souhaites, ajoute quelques mots à ta réponse.')).toHaveValue('Vert.');
  });
});
