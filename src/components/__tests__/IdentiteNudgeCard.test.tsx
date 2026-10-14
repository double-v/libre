/**
 * Tests — la carte « dis qui tu es » (#517) : le rang d'identité de la
 * relance. La déclaration se fait dans la carte avec la case art. 9 en
 * ligne (#425), jamais pré-cochée ; « Plus tard » écarte ; le champ
 * « Je ne souhaite pas le préciser » n'est pas une déclaration (#519).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import IdentiteNudgeCard from '../IdentiteNudgeCard';
import { NUDGE_IDENTITE_COPY } from '@/lib/onboarding';

describe('<IdentiteNudgeCard />', () => {
  beforeEach(() => vi.restoreAllMocks());

  it.each(['genre', 'orientation'] as const)('%s : copie dit l\'effet, aucun chiffre', (kind) => {
    render(<IdentiteNudgeCard kind={kind} consentSensible={true} onDeclared={vi.fn()} onDismiss={vi.fn()} />);
    const card = screen.getByLabelText('Se déclarer');
    expect(card).toHaveTextContent(NUDGE_IDENTITE_COPY[kind].title);
    expect(card.textContent).not.toMatch(/\d/);
  });

  it('genre : le champ ne propose pas le silence, la porte ne pose jamais un vide (#519)', () => {
    const onDeclared = vi.fn();
    render(<IdentiteNudgeCard kind="genre" consentSensible={true} onDeclared={onDeclared} onDismiss={vi.fn()} />);
    expect(screen.getAllByRole('option').some((o) => o.textContent === 'Je ne souhaite pas le préciser')).toBe(false);
    // Champ vide + « Enregistrer » : rien n'écrit, l'erreur le dit.
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(onDeclared).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('sans consent art. 9 : la case vient dans la carte, l\'enregistrement l\'amène (#425)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    const onDeclared = vi.fn();
    render(<IdentiteNudgeCard kind="genre" consentSensible={false} onDeclared={onDeclared} onDismiss={vi.fn()} />);
    // Genre choisi puis clic sans case : rien n'écrit, la copie requise reste.
    fireEvent.change(screen.getByLabelText('Ton genre'), { target: { value: 'femme' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(screen.getByText('Coche la case pour enregistrer ces informations.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(onDeclared).toHaveBeenCalledWith('genderIdentity'));
    const body = JSON.parse(String(fetchMock.mock.calls.at(-1)![1].body));
    expect(body).toEqual({ genderIdentity: 'femme', sensitiveConsent: true });
  });

  it('avec consent art. 9 déjà donné : pas de case, le PUT ne repasse pas le consentement', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    const onDeclared = vi.fn();
    render(<IdentiteNudgeCard kind="orientation" consentSensible={true} onDeclared={onDeclared} onDismiss={vi.fn()} />);
    expect(screen.queryByRole('checkbox')).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'Hétéro' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(onDeclared).toHaveBeenCalledWith('orientation'));
    const body = JSON.parse(String(fetchMock.mock.calls.at(-1)![1].body));
    expect(body).toEqual({ orientation: ['hétéro'] });
  });

  it('« Plus tard » écarte sans écrire', () => {
    const onDismiss = vi.fn();
    const onDeclared = vi.fn();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<IdentiteNudgeCard kind="genre" consentSensible={true} onDeclared={onDeclared} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: 'Plus tard' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onDeclared).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});