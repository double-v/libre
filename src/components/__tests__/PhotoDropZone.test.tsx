/**
 * PhotoDropZone (#413) — la même invitation que le parcours d'accueil,
 * réutilisée en tête du profil sans photo.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PhotoDropZone from '../PhotoDropZone';

describe('<PhotoDropZone />', () => {
  it('initiale, contraintes, bouton, et remonte le fichier choisi', () => {
    const onFile = vi.fn();
    render(<PhotoDropZone initial="S" onFile={onFile} />);
    expect(screen.getByText('S')).toBeInTheDocument();
    // La limite affichée est celle de la route (src/lib/r2.ts) : 5 Mo.
    expect(screen.getByText(/JPG, PNG ou WebP · 5 Mo max/)).toBeInTheDocument();
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText('Ajouter une photo'), { target: { files: [file] } });
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it('erreur → message en alerte et bouton « Réessayer »', () => {
    render(<PhotoDropZone initial="S" onFile={vi.fn()} error="Trop lourde" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Trop lourde');
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
  });
});
