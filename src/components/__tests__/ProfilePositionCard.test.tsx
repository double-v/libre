/**
 * ProfilePositionCard (#405/#407, spec 004) : la carte dit toujours la source
 * courante (FR-005), « Retirer » n'existe que pour une ville, et un choix
 * déclenche l'écriture puis le rechargement (FR-006).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ProfilePositionCard, { POSITION_COPY } from '../ProfilePositionCard';
import type { CityCandidate } from '@/lib/geocoding';

const lyon: CityCandidate = { label: 'Lyon', qualifier: '69, Rhône', country: 'France', lat: 45.76, lng: 4.83 };

describe('ProfilePositionCard', () => {
  it('aucune position : le picker est ouvert d’emblée, pas de « Retirer »', () => {
    render(<ProfilePositionCard positionSource={null} cityLabel={null} invisibleMode={false} onChanged={() => {}} />);
    expect(screen.getByText(POSITION_COPY.none)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.queryByText(POSITION_COPY.remove)).toBeNull();
  });

  it('ville : « Ta ville : X », Changer et Retirer', () => {
    render(<ProfilePositionCard positionSource="city" cityLabel="Lyon (69)" invisibleMode={false} onChanged={() => {}} />);
    expect(screen.getByText('Ta ville : Lyon (69)')).toBeInTheDocument();
    expect(screen.getByText(POSITION_COPY.change)).toBeInTheDocument();
    expect(screen.getByText(POSITION_COPY.remove)).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('appareil : « Position de ton appareil », proposer une ville à la place, pas de Retirer', () => {
    render(<ProfilePositionCard positionSource="device" cityLabel={null} invisibleMode={false} onChanged={() => {}} />);
    expect(screen.getByText(POSITION_COPY.device)).toBeInTheDocument();
    expect(screen.getByText(POSITION_COPY.useCity)).toBeInTheDocument();
    expect(screen.queryByText(POSITION_COPY.remove)).toBeNull();
  });

  it('mode invisible : la mention remplace le sous-titre', () => {
    render(<ProfilePositionCard positionSource="city" cityLabel="Lyon (69)" invisibleMode onChanged={() => {}} />);
    expect(screen.getByText(POSITION_COPY.invisible)).toBeInTheDocument();
    expect(screen.queryByText(POSITION_COPY.citySub)).toBeNull();
  });

  it('Retirer écrit city: null puis recharge ; une erreur s’affiche sans casser la carte', async () => {
    const saveCity = vi.fn(async () => {});
    const onChanged = vi.fn();
    render(<ProfilePositionCard positionSource="city" cityLabel="Lyon (69)" invisibleMode={false} onChanged={onChanged} saveCity={saveCity} />);
    await act(async () => { fireEvent.click(screen.getByText(POSITION_COPY.remove)); });
    expect(saveCity).toHaveBeenCalledWith(null);
    expect(onChanged).toHaveBeenCalledTimes(1);

    saveCity.mockRejectedValueOnce(new Error('500'));
    await act(async () => { fireEvent.click(screen.getByText(POSITION_COPY.remove)); });
    expect(screen.getByRole('alert')).toHaveTextContent(POSITION_COPY.error);
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('Changer ouvre le picker ; choisir une ville écrit le candidat et referme', async () => {
    vi.useFakeTimers();
    const saveCity = vi.fn(async () => {});
    const onChanged = vi.fn();
    render(
      <ProfilePositionCard positionSource="city" cityLabel="Paris (75)" invisibleMode={false} onChanged={onChanged} saveCity={saveCity} search={async () => [lyon]} />,
    );
    fireEvent.click(screen.getByText(POSITION_COPY.change));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'lyon' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(350); });
    await act(async () => { fireEvent.click(screen.getByRole('option')); });
    expect(saveCity).toHaveBeenCalledWith(lyon);
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('combobox')).toBeNull();
    vi.useRealTimers();
  });
});
