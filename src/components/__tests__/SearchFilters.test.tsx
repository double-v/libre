/**
 * Tests composant — SearchFilters (filtres de recherche partagés #235).
 *
 * Vérifie :
 * 1. Sélectionner un genre émet la nouvelle valeur (préférence « qui je veux voir »)
 * 2. Le slider distance n'apparaît que si distanceKm + onDistanceChange sont fournis
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

  it('hides the distance slider unless distance props are provided', () => {
    const { rerender } = render(
      <SearchFilters value={EMPTY_SEARCH_FILTERS} onChange={vi.fn()} />,
    );
    expect(screen.queryByLabelText('Distance maximale')).toBeNull();

    rerender(
      <SearchFilters
        value={EMPTY_SEARCH_FILTERS}
        onChange={vi.fn()}
        distanceKm={50}
        onDistanceChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Distance maximale')).toBeInTheDocument();
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
  });
});
