/**
 * CityPicker (#405, spec 004) — comportement, pas rendu : debounce et seuil de
 * 3 lettres (FR-010), choix explicite parmi des homonymes qualifiés (SC-005),
 * états vide / indisponible (FR-009), clavier.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CityPicker, { CITY_PICKER_COPY, CitySearchError } from '../CityPicker';
import type { CityCandidate } from '@/lib/geocoding';

const sd93: CityCandidate = { label: 'Saint-Denis', qualifier: '93, Seine-Saint-Denis', country: 'France', lat: 48.93, lng: 2.36 };
const sd974: CityCandidate = { label: 'Saint-Denis', qualifier: '974, La Réunion', country: 'France', lat: -20.9, lng: 55.44 };
const sdQc: CityCandidate = { label: 'Saint-Denis', qualifier: 'Québec', country: 'Canada', lat: 46.06, lng: -71.13 };

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

async function type(value: string) {
  fireEvent.change(screen.getByRole('combobox'), { target: { value } });
  await act(async () => { await vi.advanceTimersByTimeAsync(350); });
}

describe('CityPicker', () => {
  it('ne cherche pas sous 3 lettres, puis cherche une seule fois après le debounce', async () => {
    const search = vi.fn(async () => [sd93]);
    render(<CityPicker onSelect={() => {}} search={search} />);
    await type('sa');
    expect(search).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'sai' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'sain' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(350); });
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith('sain');
  });

  it('affiche chaque homonyme avec son qualificatif et remonte le candidat cliqué', async () => {
    const onSelect = vi.fn();
    render(<CityPicker onSelect={onSelect} search={async () => [sd93, sd974, sdQc]} />);
    await type('saint-den');
    const options = screen.getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual([
      'Saint-Denis93, Seine-Saint-Denis',
      'Saint-Denis974, La Réunion',
      'Saint-DenisQuébec, Canada',
    ]);
    fireEvent.click(options[1]);
    expect(onSelect).toHaveBeenCalledWith(sd974);
    expect(screen.queryByRole('listbox')).toBeNull();
    expect((screen.getByRole('combobox') as HTMLInputElement).value).toBe('Saint-Denis — 974, La Réunion');
  });

  it('se pilote au clavier : ↓ ↓ ⏎ choisit la troisième, ⎋ ferme', async () => {
    const onSelect = vi.fn();
    render(<CityPicker onSelect={onSelect} search={async () => [sd93, sd974, sdQc]} />);
    await type('saint-den');
    const input = screen.getByRole('combobox');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[2]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(sdQc);
  });

  it('dit « aucune ville » sur une liste vide, « réessaie » sur un service en panne', async () => {
    const { unmount } = render(<CityPicker onSelect={() => {}} search={async () => []} />);
    await type('xyzzy');
    expect(screen.getByRole('status')).toHaveTextContent(CITY_PICKER_COPY.empty);
    unmount();

    render(<CityPicker onSelect={() => {}} search={async () => { throw new CitySearchError(503); }} />);
    await type('lyon');
    expect(screen.getByRole('status')).toHaveTextContent(CITY_PICKER_COPY.unavailable);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('ignore une réponse arrivée après une frappe plus récente', async () => {
    let resolveOld!: (v: CityCandidate[]) => void;
    const search = vi.fn()
      .mockImplementationOnce(() => new Promise<CityCandidate[]>((r) => { resolveOld = r; }))
      .mockImplementationOnce(async () => [sd974]);
    render(<CityPicker onSelect={() => {}} search={search} />);
    await type('saint');
    await type('saint-denis 974');
    await act(async () => { resolveOld([sd93]); });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option')).toHaveTextContent('974');
  });
});
