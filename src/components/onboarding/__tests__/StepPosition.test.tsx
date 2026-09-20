/**
 * Tests — étape « où » (spec 005, FR-009) : appareil d'abord, ville en repli,
 * jamais bloquant.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StepPosition from '../StepPosition';

const nantes = { label: 'Nantes', qualifier: '44, Loire-Atlantique', country: 'France', lat: 47.2184, lng: -1.5536 };

describe('<StepPosition />', () => {
  it('« Utiliser ma position » enregistre puis passe', async () => {
    const requestDevicePosition = vi.fn().mockResolvedValue({ ok: true });
    const onDone = vi.fn();
    render(<StepPosition requestDevicePosition={requestDevicePosition} saveCity={vi.fn()} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: /Utiliser ma position/ }));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it('en refus, dit pourquoi et déplie la saisie de ville', async () => {
    const requestDevicePosition = vi.fn().mockResolvedValue({ ok: false, kind: 'denied', message: 'Autorisation refusée.' });
    render(<StepPosition requestDevicePosition={requestDevicePosition} saveCity={vi.fn()} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Utiliser ma position/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Autorisation refusée.');
    expect(screen.getByLabelText('Ta ville')).toBeInTheDocument();
  });

  it('une ville choisie est enregistrée puis on passe', async () => {
    const saveCity = vi.fn().mockResolvedValue(undefined);
    const search = vi.fn().mockResolvedValue([nantes]);
    const onDone = vi.fn();
    render(<StepPosition requestDevicePosition={vi.fn()} saveCity={saveCity} searchCities={search} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: /Saisir ma ville/ }));
    fireEvent.change(screen.getByLabelText('Ta ville'), { target: { value: 'Nan' } });
    fireEvent.click(await screen.findByRole('option', { name: /Nantes/ }));
    await waitFor(() => expect(saveCity).toHaveBeenCalledWith(nantes));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it('« Plus tard » passe sans rien enregistrer', () => {
    const onDone = vi.fn();
    const saveCity = vi.fn();
    render(<StepPosition requestDevicePosition={vi.fn()} saveCity={saveCity} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: 'Plus tard' }));
    expect(saveCity).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
