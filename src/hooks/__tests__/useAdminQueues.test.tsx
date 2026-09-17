/**
 * Tests — useAdminQueues (#391, spec 003 US3, T034 / R7).
 *
 * Le hook ne fait rien pour un non-admin (FR-013 : rien de visible NI de
 * chargé) ; pour un admin il recharge les compteurs au montage, à chaque
 * changement de route et au retour au premier plan — pas de canal temps réel,
 * pas de minuterie (Q3). Chaque test compte les fetch pour que « recharge »
 * veuille dire « un appel de plus », pas « au moins un appel ».
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

let pathname = '/discover';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

const { useAdminQueues } = await import('../useAdminQueues');

const fetchMock = vi.fn();

function respond(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) });
}

beforeEach(() => {
  vi.clearAllMocks();
  pathname = '/discover';
  fetchMock.mockImplementation(() => respond({ reports: 1, verifications: 0, feedback: 0 }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('useAdminQueues', () => {
  it('ne charge rien quand enabled=false', async () => {
    const { result } = renderHook(() => useAdminQueues({ enabled: false }));
    await act(async () => {});
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.hasPending).toBe(false);
  });

  it('charge au montage et expose hasPending dès qu’une file est non vide', async () => {
    const { result } = renderHook(() => useAdminQueues({ enabled: true }));
    await waitFor(() => expect(result.current.hasPending).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/queues', expect.objectContaining({ cache: 'no-store' }));
  });

  it('hasPending reste faux quand les trois files sont vides', async () => {
    fetchMock.mockImplementation(() => respond({ reports: 0, verifications: 0, feedback: 0 }));
    const { result } = renderHook(() => useAdminQueues({ enabled: true }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await act(async () => {});
    expect(result.current.hasPending).toBe(false);
  });

  it('recharge à chaque changement de route', async () => {
    const { result, rerender } = renderHook(() => useAdminQueues({ enabled: true }));
    await waitFor(() => expect(result.current.hasPending).toBe(true));
    fetchMock.mockImplementation(() => respond({ reports: 0, verifications: 0, feedback: 0 }));
    pathname = '/messages';
    rerender();
    await waitFor(() => expect(result.current.hasPending).toBe(false));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('recharge au retour au premier plan', async () => {
    const { result } = renderHook(() => useAdminQueues({ enabled: true }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fetchMock.mockImplementation(() => respond({ reports: 0, verifications: 3, feedback: 0 }));
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.hasPending).toBe(true));
  });

  it('une réponse en erreur laisse l’état précédent, sans lever', async () => {
    const { result, rerender } = renderHook(() => useAdminQueues({ enabled: true }));
    await waitFor(() => expect(result.current.hasPending).toBe(true));
    fetchMock.mockImplementation(() => respond({ error: 'Not found' }, false));
    pathname = '/settings';
    rerender();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await act(async () => {});
    expect(result.current.hasPending).toBe(true);
  });

  it('cesse de charger si enabled repasse à false (déconnexion)', async () => {
    const { rerender } = renderHook(({ enabled }) => useAdminQueues({ enabled }), {
      initialProps: { enabled: true },
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    rerender({ enabled: false });
    pathname = '/messages';
    rerender({ enabled: false });
    await act(async () => {});
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
