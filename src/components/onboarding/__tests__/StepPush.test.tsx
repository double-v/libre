/**
 * Tests — proposition push en fin de parcours (spec 005, FR-013 à FR-016, #411).
 * Une fois par appareil, appareil compatible seulement, copie qui ne parle que
 * du match.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StepPush from '../StepPush';
import { PUSH_ASKED_KEY } from '@/lib/onboarding';

const supported = () => ({ supported: true, iosNotInstalled: false, permission: 'default' as const });
const unsupported = () => ({ supported: false, iosNotInstalled: false, permission: 'default' as const });

beforeEach(() => {
  window.localStorage.clear();
});

describe('<StepPush />', () => {
  it('appareil incompatible → rien, on passe', async () => {
    const onDone = vi.fn();
    const { container } = render(<StepPush onDone={onDone} getPushSupport={unsupported} getPushState={vi.fn()} enablePush={vi.fn()} />);
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(container).toBeEmptyDOMElement();
  });

  it.each(['on', 'denied'] as const)('push déjà « %s » → on passe', async (state) => {
    const onDone = vi.fn();
    render(<StepPush onDone={onDone} getPushSupport={supported} getPushState={vi.fn().mockResolvedValue(state)} enablePush={vi.fn()} />);
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/prévenu/)).toBeNull();
  });

  it('déjà proposé sur cet appareil → on passe sans redemander', async () => {
    window.localStorage.setItem(PUSH_ASKED_KEY, new Date().toISOString());
    const onDone = vi.fn();
    const getPushState = vi.fn();
    render(<StepPush onDone={onDone} getPushSupport={supported} getPushState={getPushState} enablePush={vi.fn()} />);
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(getPushState).not.toHaveBeenCalled();
  });

  it('« Oui, sur cet appareil » active puis passe ; la copie ne parle que du match', async () => {
    const enablePush = vi.fn().mockResolvedValue('on');
    const onDone = vi.fn();
    render(<StepPush onDone={onDone} getPushSupport={supported} getPushState={vi.fn().mockResolvedValue('off')} enablePush={enablePush} />);
    expect(await screen.findByRole('heading', { name: 'Être prévenu·e si ça matche ?' })).toBeInTheDocument();
    const text = document.body.textContent ?? '';
    expect(text.toLowerCase()).not.toMatch(/like|message/);
    expect(text).not.toMatch(/\d/);

    fireEvent.click(screen.getByRole('button', { name: 'Oui, sur cet appareil' }));
    await waitFor(() => expect(enablePush).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(window.localStorage.getItem(PUSH_ASKED_KEY)).toBeTruthy();
  });

  it('« Plus tard » mémorise sur l’appareil, n’active rien, passe', async () => {
    const enablePush = vi.fn();
    const onDone = vi.fn();
    render(<StepPush onDone={onDone} getPushSupport={supported} getPushState={vi.fn().mockResolvedValue('off')} enablePush={enablePush} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Plus tard' }));
    expect(enablePush).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(PUSH_ASKED_KEY)).toBeTruthy();
  });
});
