/**
 * Tests — section « Pseudo » des Paramètres (#459).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PseudoSettings from '../PseudoSettings';

afterEach(() => vi.unstubAllGlobals());

function stubPatch(status: number, body: unknown) {
  const f = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', f);
  return f;
}

describe('<PseudoSettings />', () => {
  it('montre le pseudo actuel et propose de le modifier', () => {
    render(<PseudoSettings initial="Camille" />);
    expect(screen.getByText('Camille')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Modifier' })).toBeInTheDocument();
  });

  it('enregistre, affiche le nouveau pseudo et le confirme', async () => {
    stubPatch(200, { displayName: 'Camille L.' });
    render(<PseudoSettings initial="Camille" />);
    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }));
    fireEvent.change(screen.getByLabelText('Nouveau pseudo'), { target: { value: 'Camille L.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Pseudo enregistré.')).toBeInTheDocument();
    expect(screen.getByText('Camille L.')).toBeInTheDocument();
  });

  it('garde le champ ouvert avec le message du serveur en cas de refus', async () => {
    stubPatch(400, { error: 'Seulement des lettres, des chiffres, des espaces et \' - . _' });
    render(<PseudoSettings initial="Camille" />);
    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }));
    fireEvent.change(screen.getByLabelText('Nouveau pseudo'), { target: { value: 'Cam*' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText(/Seulement des lettres/)).toBeInTheDocument();
    expect(screen.getByLabelText('Nouveau pseudo')).toHaveValue('Cam*');
  });

  it('annuler referme sans rien envoyer', () => {
    const f = stubPatch(200, {});
    render(<PseudoSettings initial="Camille" />);
    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }));
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.getByText('Camille')).toBeInTheDocument();
    expect(f).not.toHaveBeenCalled();
  });
});
