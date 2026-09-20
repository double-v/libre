/**
 * Tests — étape photo du parcours d'accueil (spec 005, FR-007).
 * Réutilise l'envoi de la page profil ; l'erreur serveur s'affiche telle
 * quelle et laisse toujours « Réessayer » et « Plus tard ».
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StepPhoto from '../StepPhoto';

const file = new File(['x'], 'moi.jpg', { type: 'image/jpeg' });

function pick(input: HTMLElement) {
  fireEvent.change(input, { target: { files: [file] } });
}

describe('<StepPhoto />', () => {
  it('affiche la zone d’ajout, puis l’aperçu et « Continuer » après un envoi réussi', async () => {
    const upload = vi.fn().mockResolvedValue({ ok: true, photos: ['k1'], photo: 'k1' });
    const onDone = vi.fn();
    render(<StepPhoto displayName="Noor" upload={upload} onDone={onDone} />);
    expect(screen.getByText('Une photo, pour commencer')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continuer' })).toBeNull();

    pick(screen.getByLabelText('Ajouter une photo'));
    await waitFor(() => expect(upload).toHaveBeenCalledWith(file));
    expect(await screen.findByText('Ajoutée')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('en échec, affiche le message serveur et laisse réessayer ou passer', async () => {
    const upload = vi.fn().mockResolvedValue({ ok: false, error: 'Maximum 6 photos autorisées' });
    const onDone = vi.fn();
    render(<StepPhoto displayName="Noor" upload={upload} onDone={onDone} />);
    pick(screen.getByLabelText('Ajouter une photo'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Maximum 6 photos autorisées');
    expect(screen.getByLabelText('Ajouter une photo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Plus tard' })).not.toBeDisabled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('« Plus tard » passe sans envoyer de photo', () => {
    const upload = vi.fn();
    const onDone = vi.fn();
    render(<StepPhoto displayName="Noor" upload={upload} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: 'Plus tard' }));
    expect(upload).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
