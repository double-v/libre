/**
 * Tests — réponses sur la fiche d'une autre personne (spec 009, US2/US4).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AnswerBlock from '../AnswerBlock';
import type { SerializedAnswer } from '@/lib/answers';

afterEach(() => vi.unstubAllGlobals());

const vis = (key: string, format: 'ouverte' | 'choix' | 'ceci-ou-cela', choices: string[], text = ''): SerializedAnswer =>
  ({ key, label: key, format, choices, text });
const veiled = (key: string, format: 'ouverte' | 'choix' | 'ceci-ou-cela' = 'ouverte'): SerializedAnswer =>
  ({ key, label: key, format, veiled: true });

describe('<AnswerBlock />', () => {
  it('montre d’abord les réponses aux mêmes questions, avec leurs pastilles', () => {
    render(<AnswerBlock answers={[vis('cafe-the', 'choix', ['cafe', 'chocolat-chaud'], 'Le matin.'), veiled('chanson')]} onAnswered={vi.fn()} />);
    expect(screen.getByText('Vos réponses aux mêmes questions')).toBeInTheDocument();
    expect(screen.getByText('Café')).toBeInTheDocument();
    expect(screen.getByText('Chocolat chaud')).toBeInTheDocument();
    expect(screen.getByText('Le matin.')).toBeInTheDocument();
  });

  it('voile une réponse et invite à répondre à la même question', () => {
    render(<AnswerBlock answers={[veiled('chanson')]} onAnswered={vi.fn()} />);
    expect(screen.getByText('Réponds à cette question pour découvrir sa réponse.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Répondre à cette question' })).toBeInTheDocument();
  });

  it('répond sur place, puis demande de relire la fiche', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ answer: vis('jeu', 'choix', ['jeux-de-mots']) }), { status: 200 })));
    const onAnswered = vi.fn();
    render(<AnswerBlock answers={[veiled('jeu', 'choix')]} onAnswered={onAnswered} />);
    fireEvent.click(screen.getByRole('button', { name: 'Répondre à cette question' }));
    expect(screen.getByText('Tu peux choisir plusieurs réponses.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Jeux de mots' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer et voir sa réponse' }));
    await waitFor(() => expect(onAnswered).toHaveBeenCalled());
  });

  it('limite les invitations à trois et replie le reste, sans aucun nombre', () => {
    const many = ['chanson', 'fait-rire', 'dimanche-ideal', 'petit-plaisir', 'rituel'].map((k) => veiled(k));
    const { container } = render(<AnswerBlock answers={many} onAnswered={vi.fn()} />);
    expect(screen.getAllByRole('button', { name: 'Répondre à cette question' })).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Voir toutes ses réponses' }));
    expect(screen.getAllByRole('button', { name: 'Répondre à cette question' })).toHaveLength(5);
    expect(screen.getByRole('button', { name: 'Afficher moins de réponses' })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\d/);
  });

  it('montre les choix « Ceci ou cela » en ligne, voilés compris', () => {
    render(<AnswerBlock answers={[vis('mer-montagne', 'ceci-ou-cela', ['mer']), veiled('sale-sucre', 'ceci-ou-cela')]} onAnswered={vi.fn()} />);
    expect(screen.getByText('Ses choix « Ceci ou cela »')).toBeInTheDocument();
    expect(screen.getByText('Mer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Salé ou sucré/ })).toBeInTheDocument();
  });

  it('ne rend rien sans réponse', () => {
    const { container } = render(<AnswerBlock answers={[]} onAnswered={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
