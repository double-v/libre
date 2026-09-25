/**
 * Tests composant — SearchFilters (filtres de recherche partagés #235).
 *
 * Vérifie :
 * 1. Sélectionner un genre émet la nouvelle valeur (préférence « qui je veux voir »)
 * 2. Le curseur de distance et son état « partout » (#327)
 * 3. « Réinitialiser » n'apparaît que quand un filtre est actif, et remet à zéro
 * 4. Le type de relation recherché se sélectionne comme l'orientation (#409)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchFilters, { EMPTY_SEARCH_FILTERS, hasActiveFilters } from '../SearchFilters';
import { MIRROR_COPY } from '@/lib/onboarding';

describe('<SearchFilters />', () => {
  it('emits the toggled gender on click', () => {
    const onChange = vi.fn();
    render(<SearchFilters value={EMPTY_SEARCH_FILTERS} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Femme' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ genders: ['femme'] }),
    );
  });

  it('affiche « partout » tant qu\'aucune distance n\'est choisie', () => {
    render(<SearchFilters value={EMPTY_SEARCH_FILTERS} onChange={vi.fn()} />);

    expect(screen.getByText('Distance maximale : partout')).toBeInTheDocument();
    // Curseur au maximum : « partout » est une position, pas un contrôle vide.
    expect(screen.getByLabelText('Distance maximale')).toHaveValue('500');
  });

  it('émet une distance en km quand on quitte le maximum', () => {
    const onChange = vi.fn();
    render(<SearchFilters value={EMPTY_SEARCH_FILTERS} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Distance maximale'), { target: { value: '25' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ distanceKm: 25 }));
  });

  it('repasse à « partout » (null) au bout du curseur — sinon le filtre serait indésactivable', () => {
    const onChange = vi.fn();
    render(
      <SearchFilters value={{ ...EMPTY_SEARCH_FILTERS, distanceKm: 25 }} onChange={onChange} />,
    );
    expect(screen.getByText('Distance maximale : 25 km')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Distance maximale'), { target: { value: '500' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ distanceKm: null }));
  });

  it('shows reset only when a filter is active and clears on click', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SearchFilters value={EMPTY_SEARCH_FILTERS} onChange={onChange} />,
    );
    expect(screen.queryByText('Réinitialiser les filtres')).toBeNull();

    rerender(
      <SearchFilters value={{ ...EMPTY_SEARCH_FILTERS, genders: ['homme'] }} onChange={onChange} />,
    );
    fireEvent.click(screen.getByText('Réinitialiser les filtres'));
    expect(onChange).toHaveBeenCalledWith(EMPTY_SEARCH_FILTERS);
  });

  it('émet le type de relation basculé (#409)', () => {
    const onChange = vi.fn();
    render(<SearchFilters value={EMPTY_SEARCH_FILTERS} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sérieux' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ relationshipTypes: ['sérieux'] }),
    );
  });

  it('retire un type de relation déjà sélectionné', () => {
    const onChange = vi.fn();
    render(
      <SearchFilters
        value={{ ...EMPTY_SEARCH_FILTERS, relationshipTypes: ['libre', 'poly'] }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Poly' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ relationshipTypes: ['libre'] }),
    );
  });

  it('hasActiveFilters reflects non-default values', () => {
    expect(hasActiveFilters(EMPTY_SEARCH_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_SEARCH_FILTERS, orientations: ['bi'] })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_SEARCH_FILTERS, relationshipTypes: ['libre'] })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_SEARCH_FILTERS, ageMin: 25 })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_SEARCH_FILTERS, distanceKm: 25 })).toBe(true);
  });
  // Spec 008 : sans intention déclarée, le filtre par intention est ignoré par
  // le serveur ; l'écran le dit au lieu de faire semblant.
  it('rend le groupe « Type de relation » inactif tant que l\'intention n\'est pas dite', () => {
    const onChange = vi.fn();
    const value = { ...EMPTY_SEARCH_FILTERS, relationshipTypes: ['sérieux'] };
    render(<SearchFilters value={value} onChange={onChange} intentionDeclared={false} />);
    const chip = screen.getByRole('button', { name: 'Sérieux' });
    expect(chip).toBeDisabled();
    // Le choix enregistré est conservé, pas effacé.
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(chip);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(MIRROR_COPY.intentionFilter)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Préciser' })).toHaveAttribute('href', '/profile#profile-section-seeking');
  });

  it('propose « Je verrai en chemin » quand l\'intention est dite', () => {
    render(<SearchFilters value={EMPTY_SEARCH_FILTERS} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Je verrai en chemin' })).toBeEnabled();
    expect(screen.queryByText(MIRROR_COPY.intentionFilter)).toBeNull();
  });
});
