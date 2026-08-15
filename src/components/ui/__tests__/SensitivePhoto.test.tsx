/**
 * Tests composant — SensitivePhoto (#330).
 *
 * Ces tests couvrent le **comportement**, pas le rendu du flou : le flou vient
 * du serveur, donc rien ici ne peut le prouver. Ce qu'on vérifie, c'est que le
 * composant demande la bonne URL — sans `?reveal=1` tant que personne n'a
 * cliqué, avec après. Le rendu, lui, se valide sur pixels.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SensitivePhoto from '../SensitivePhoto';

const KEY = 'user-1/photo-1.jpg';
const SRC = `/api/photos/${encodeURIComponent(KEY)}`;

describe('<SensitivePhoto />', () => {
  it('affiche la photo sans voile quand elle n\'est pas classée', () => {
    render(<SensitivePhoto photoKey={KEY} alt="Camille" />);

    expect(screen.getByAltText('Camille')).toHaveAttribute('src', SRC);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('pose le voile et propose « Voir » quand la photo est voilée', () => {
    render(<SensitivePhoto photoKey={KEY} alt="Camille" veiled />);

    expect(screen.getByRole('button', { name: /Voir la photo de Camille/ })).toBeInTheDocument();
    // L'alt dit l'état : un lecteur d'écran ne voit pas le flou.
    expect(screen.getByAltText('Camille (floutée)')).toBeInTheDocument();
  });

  it('ne demande l\'original qu\'après le clic', () => {
    render(<SensitivePhoto photoKey={KEY} alt="Camille" veiled />);

    // Avant : aucune requête vers l'original.
    expect(screen.getByAltText('Camille (floutée)')).toHaveAttribute('src', SRC);

    fireEvent.click(screen.getByRole('button', { name: /Voir la photo/ }));

    expect(screen.getByAltText('Camille')).toHaveAttribute('src', `${SRC}?reveal=1`);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('n\'entraîne pas la carte parente au clic sur « Voir »', () => {
    // Sans stopPropagation, révéler ouvrirait aussitôt la fiche du profil.
    const onParentClick = vi.fn();
    render(
      <div onClick={onParentClick}>
        <SensitivePhoto photoKey={KEY} alt="Camille" veiled />
      </div>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Voir la photo/ }));

    expect(onParentClick).not.toHaveBeenCalled();
  });

  it('reste voilée sans bouton quand la révélation est désactivée', () => {
    // Cas des vignettes de 56 px, trop petites pour une cible tactile.
    render(<SensitivePhoto photoKey={KEY} alt="Camille" veiled revealable={false} />);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByAltText('Camille (floutée)')).toHaveAttribute('src', SRC);
  });

  it('affiche la pastille de niveau sur ses propres photos', () => {
    render(<SensitivePhoto photoKey={KEY} alt="Ma photo" badge="Suggestive" />);

    expect(screen.getByText('Suggestive')).toBeInTheDocument();
    // Le propriétaire voit net : pas de voile, donc pas de bouton.
    expect(screen.queryByRole('button')).toBeNull();
  });
});
