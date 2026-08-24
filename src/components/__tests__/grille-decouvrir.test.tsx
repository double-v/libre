/**
 * Tests composant — la grille de Découvrir (#348).
 *
 * Ce que la colonne de 512px ne posait pas comme question, et que la grille
 * pose :
 * 1. La règle de remplissage de fin de grille — bornée par la géométrie, donc
 *    incapable de noyer 3 profils réels sous 10 vignettes factices.
 * 2. Une vignette d'attente ne doit **jamais** être annoncée comme une
 *    personne (lecteur d'écran compris) — cf. PRODUCT.md, humain d'abord.
 * 3. La carte de parrainage est **unique** et referme la grille.
 * 4. Liker depuis une cellule ne doit pas ouvrir la fiche par-dessus l'action :
 *    en carte photo-first, tout le média est cliquable, donc le clic remonte.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GridFillerCards, { fillerCount } from '../GridFillerCards';
import ProfileCard from '../ProfileCard';

describe('fillerCount — la règle de fin de grille', () => {
  it('complète la dernière rangée, carte de parrainage comprise', () => {
    // La carte de parrainage occupe une cellule : le total visé est donc
    // (réels + vignettes + 1) multiple du nombre de colonnes.
    for (const real of [0, 1, 2, 3, 4, 5, 10, 11, 12]) {
      expect((real + fillerCount(real, 3) + 1) % 3).toBe(0);
    }
  });

  it('reproduit le canvas validé : 3 profils → 2 vignettes + parrainage', () => {
    expect(fillerCount(3, 3)).toBe(2);
  });

  it('ne triche jamais de plus de colonnes-1 vignettes', () => {
    for (let real = 0; real < 40; real++) {
      expect(fillerCount(real, 3)).toBeLessThanOrEqual(2);
    }
  });

  it("s'adapte au nombre de colonnes servi", () => {
    expect(fillerCount(2, 2)).toBe(1);
    expect(fillerCount(3, 2)).toBe(0);
  });
});

describe('<GridFillerCards />', () => {
  it('ne présente aucune vignette d’attente comme une personne', () => {
    render(<GridFillerCards realCount={3} />);

    // Visibles à l'œil…
    const vignettes = screen.queryAllByText('Une place libre');
    expect(vignettes).toHaveLength(2);
    // …et retirées de l'arbre d'accessibilité : le lecteur d'écran ne compte
    // que des personnes réelles.
    for (const vignette of vignettes) {
      expect(vignette.closest('[aria-hidden="true"]')).not.toBeNull();
    }
  });

  it('referme la grille avec une seule carte de parrainage', () => {
    render(<GridFillerCards realCount={7} />);

    expect(screen.getAllByRole('button', { name: 'Copier le lien' })).toHaveLength(1);
    expect(screen.getByText('Fais tourner')).toBeInTheDocument();
  });
});

describe('<ProfileCard /> en cellule de grille', () => {
  const base = {
    id: 'u1',
    displayName: 'Marion',
    age: 49,
    bio: 'Je cours le dimanche.',
    isVerified: false,
    onLike: vi.fn(),
    onPass: vi.fn(),
  };

  it('dit le manque de photo au lieu de le maquiller', () => {
    render(<ProfileCard {...base} photos={[]} />);
    expect(screen.getByText('Pas encore de photo')).toBeInTheDocument();
  });

  it('like sans ouvrir la fiche', async () => {
    const onLike = vi.fn();
    const onProfileClick = vi.fn();
    render(<ProfileCard {...base} onLike={onLike} onProfileClick={onProfileClick} />);

    await userEvent.click(screen.getByRole('button', { name: 'Like Marion' }));

    expect(onLike).toHaveBeenCalledTimes(1);
    expect(onProfileClick).not.toHaveBeenCalled();
  });

  it('ouvre la fiche quand on clique la carte elle-même', async () => {
    const onProfileClick = vi.fn();
    render(<ProfileCard {...base} onProfileClick={onProfileClick} />);

    await userEvent.click(screen.getByRole('group', { name: 'Profil de Marion' }));

    expect(onProfileClick).toHaveBeenCalledWith('u1');
  });

  it('n’énonce aucune largeur : la cellule décide', () => {
    render(<ProfileCard {...base} />);
    const card = screen.getByRole('group', { name: 'Profil de Marion' });
    expect(card.className).not.toMatch(/max-w-|w-\[/);
  });
});
