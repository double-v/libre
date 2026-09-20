/**
 * Tests — page /bienvenue (spec 005, FR-004/007/010).
 *
 * La page lit l'avancement, rend l'étape correspondante, écrit `onboardingStep`
 * à chaque passage AVANT d'afficher la suite, et renvoie vers Découvrir une
 * fois à 3. Les étapes elles-mêmes sont testées à part : ici on les remplace
 * par des doublures qui n'exposent que « fait ».
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn(), back: vi.fn() }),
}));

vi.mock('@/components/onboarding/StepPhoto', () => ({
  __esModule: true,
  default: ({ onDone }: { onDone: () => void }) => <button onClick={onDone}>step-photo</button>,
}));
vi.mock('@/components/onboarding/StepSeeking', () => ({
  __esModule: true,
  default: ({ onContinue, onLater }: { onContinue: (p: unknown) => void; onLater: () => void }) => (
    <>
      <button onClick={() => onContinue({ relationshipType: ['libre'], searchRelationshipTypes: ['libre'], searchGenders: [], searchOrientations: [] })}>step-seeking-continue</button>
      <button onClick={onLater}>step-seeking-later</button>
    </>
  ),
}));
vi.mock('@/components/onboarding/StepPosition', () => ({
  __esModule: true,
  default: ({ onDone }: { onDone: () => void }) => <button onClick={onDone}>step-position</button>,
}));
vi.mock('@/components/onboarding/StepPush', () => ({
  __esModule: true,
  default: ({ onDone }: { onDone: () => void }) => <button onClick={onDone}>step-push</button>,
}));

import BienvenuePage from '../page';

const calls: Array<{ url: string; init?: RequestInit }> = [];
function stubFetch(step: number | null) {
  calls.length = 0;
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (url === '/api/users/profile' && (!init || init.method === undefined)) {
      return Promise.resolve({
        ok: true, status: 200,
        json: async () => ({ displayName: 'Noor', profile: step === null ? null : { onboardingStep: step, photos: [] } }),
      } as Response);
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => ({ profile: {} }) } as Response);
  }));
}
const puts = () => calls.filter((c) => c.url === '/api/users/profile' && c.init?.method === 'PUT').map((c) => JSON.parse(String(c.init?.body)));

beforeEach(() => { mockReplace.mockClear(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('/bienvenue', () => {
  it('rend l’étape de l’avancement lu (1 → ce que tu cherches)', async () => {
    stubFetch(1);
    render(<BienvenuePage />);
    expect(await screen.findByText('step-seeking-continue')).toBeInTheDocument();
    expect(screen.queryByText('step-photo')).toBeNull();
  });

  it('un profil absent vaut 0 → étape photo', async () => {
    stubFetch(null);
    render(<BienvenuePage />);
    expect(await screen.findByText('step-photo')).toBeInTheDocument();
  });

  it('à 3, renvoie immédiatement vers Découvrir', async () => {
    stubFetch(3);
    render(<BienvenuePage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/discover'));
  });

  it('chaque passage écrit l’avancement avant d’afficher la suite, puis push, puis Découvrir', async () => {
    stubFetch(0);
    render(<BienvenuePage />);
    fireEvent.click(await screen.findByText('step-photo'));
    await waitFor(() => expect(puts()).toEqual([{ onboardingStep: 1 }]));
    expect(await screen.findByText('step-seeking-continue')).toBeInTheDocument();

    fireEvent.click(screen.getByText('step-seeking-continue'));
    await waitFor(() => expect(puts()).toHaveLength(2));
    expect(puts()[1]).toEqual({
      relationshipType: ['libre'], searchRelationshipTypes: ['libre'], searchGenders: [], searchOrientations: [], onboardingStep: 2,
    });
    expect(await screen.findByText('step-position')).toBeInTheDocument();

    fireEvent.click(screen.getByText('step-position'));
    // FR-014/R8 : terminé AVANT la proposition push.
    await waitFor(() => expect(puts()[2]).toEqual({ onboardingStep: 3 }));
    expect(await screen.findByText('step-push')).toBeInTheDocument();

    fireEvent.click(screen.getByText('step-push'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/discover'));
  });

  it('« Plus tard » sur ce que tu cherches n’envoie que l’avancement', async () => {
    stubFetch(1);
    render(<BienvenuePage />);
    fireEvent.click(await screen.findByText('step-seeking-later'));
    await waitFor(() => expect(puts()).toEqual([{ onboardingStep: 2 }]));
  });
});
