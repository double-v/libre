/**
 * Tests composant — SearchFilters (filtres de recherche partagés #235).
 *
 * Vérifie :
 * 1. Sélectionner un genre émet la nouvelle valeur (préférence « qui je veux voir »)
 * 2. Le curseur de distance et son état « partout » (#327)
 * 3. « Réinitialiser » n'apparaît que quand un filtre est actif, et remet à zéro
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchFilters, { EMPTY_SEARCH_FILTERS, hasActiveFilters } from '../SearchFilters';

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

  it('hasActiveFilters reflects non-default values', () => {
    expect(hasActiveFilters(EMPTY_SEARCH_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_SEARCH_FILTERS, orientations: ['bi'] })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_SEARCH_FILTERS, ageMin: 25 })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_SEARCH_FILTERS, distanceKm: 25 })).toBe(true);
  });
});
