/**
 * Repère « ta vérification a une réponse » (spec 012, FR-010) : allumé par
 * un refus pas encore vu, éteint dès que la page `/verify` signale l'avoir
 * montré, sans attendre une navigation. Aucun appel pour un visiteur.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useVerificationStatut } from '../useVerificationStatut';
import { VERIFICATION_VUE_EVENT } from '@/lib/verification/client';

vi.mock('next/navigation', () => ({ usePathname: () => '/discover' }));

let reponse: Record<string, unknown>;
const appels: string[] = [];
beforeEach(() => {
  appels.length = 0;
  reponse = { statut: 'refusee', nonVu: true, tentative: 2, motif: null };
  global.fetch = vi.fn(async (url: string) => {
    appels.push(url);
    return new Response(JSON.stringify(reponse), { status: 200 });
  }) as unknown as typeof fetch;
});

describe('useVerificationStatut', () => {
  it('refus non vu : repère allumé ; marqué vu : éteint sur l’événement', async () => {
    const { result } = renderHook(() => useVerificationStatut({ enabled: true }));
    await waitFor(() => expect(result.current.refusNonVu).toBe(true));
    reponse = { ...reponse, nonVu: false };
    act(() => { window.dispatchEvent(new Event(VERIFICATION_VUE_EVENT)); });
    await waitFor(() => expect(result.current.refusNonVu).toBe(false));
  });

  it.each([
    [{ statut: 'en_cours' }],
    [{ statut: 'validee' }],
    [{ statut: 'refusee', nonVu: false }],
    [{ statut: 'refusee', nonVu: 'true' }],
  ])('%j : pas de repère', async (r) => {
    reponse = r;
    const { result } = renderHook(() => useVerificationStatut({ enabled: true }));
    await waitFor(() => expect(appels.length).toBeGreaterThan(0));
    expect(result.current.refusNonVu).toBe(false);
  });

  it('visiteur : aucun appel, aucun repère', async () => {
    const { result } = renderHook(() => useVerificationStatut({ enabled: false }));
    await new Promise((r) => setTimeout(r, 10));
    expect(appels).toEqual([]);
    expect(result.current.refusNonVu).toBe(false);
  });
});
