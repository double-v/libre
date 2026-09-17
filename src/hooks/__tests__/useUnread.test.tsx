/**
 * Tests — useUnread / UnreadProvider (#389, spec 003 R5).
 *
 * L'état « non lu » est chargé depuis la base (source de vérité) et
 * resynchronisé sur trois signaux : l'événement temps réel `new-message` du
 * canal utilisateur, le retour au premier plan, et l'événement DOM
 * `libre:unread-changed` émis par la page de conversation après marquage lu.
 * Hors provider (landing, admin), le hook rend un état vide sans lever : le
 * SiteNav y est monté aussi.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

const bound: Record<string, (data: unknown) => void> = {};
const fakeChannel = {
  bind: vi.fn((event: string, cb: (data: unknown) => void) => { bound[event] = cb; }),
  unbind: vi.fn(),
};
const release = vi.fn();
const mockSubscribeUserChannel = vi.fn((_userId: string) => ({ channel: fakeChannel, release }));
vi.mock('@/lib/pusher-client', () => ({
  __esModule: true,
  subscribeUserChannel: (id: string) => mockSubscribeUserChannel(id),
}));

const { UnreadProvider, useUnread } = await import('../useUnread');

const fetchMock = vi.fn();

function wrapper({ children }: { children: ReactNode }) {
  return <UnreadProvider userId="me">{children}</UnreadProvider>;
}

function respond(ids: string[]) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve({ conversationIds: ids }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(bound)) delete bound[k];
  fetchMock.mockImplementation(() => respond(['c1']));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('useUnread', () => {
  it('charge les non-lus au montage et expose hasUnread / isUnread', async () => {
    const { result } = renderHook(() => useUnread(), { wrapper });
    await waitFor(() => expect(result.current.hasUnread).toBe(true));
    expect(fetchMock).toHaveBeenCalledWith('/api/chat/unread', expect.objectContaining({ cache: 'no-store' }));
    expect(result.current.isUnread('c1')).toBe(true);
    expect(result.current.isUnread('c2')).toBe(false);
  });

  it("s'abonne au canal utilisateur et refetch sur new-message", async () => {
    const { result } = renderHook(() => useUnread(), { wrapper });
    await waitFor(() => expect(result.current.hasUnread).toBe(true));
    expect(mockSubscribeUserChannel).toHaveBeenCalledWith('me');
    fetchMock.mockImplementation(() => respond(['c1', 'c2']));
    act(() => bound['new-message']?.({ conversationId: 'c2' }));
    await waitFor(() => expect(result.current.isUnread('c2')).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('refetch au retour au premier plan', async () => {
    const { result } = renderHook(() => useUnread(), { wrapper });
    await waitFor(() => expect(result.current.hasUnread).toBe(true));
    fetchMock.mockImplementation(() => respond([]));
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    await waitFor(() => expect(result.current.hasUnread).toBe(false));
  });

  it('refetch sur libre:unread-changed (marquage lu par la page chat)', async () => {
    const { result } = renderHook(() => useUnread(), { wrapper });
    await waitFor(() => expect(result.current.hasUnread).toBe(true));
    fetchMock.mockImplementation(() => respond([]));
    act(() => { window.dispatchEvent(new Event('libre:unread-changed')); });
    await waitFor(() => expect(result.current.hasUnread).toBe(false));
  });

  it('rend sa référence de canal au démontage', async () => {
    const { unmount } = renderHook(() => useUnread(), { wrapper });
    await waitFor(() => expect(mockSubscribeUserChannel).toHaveBeenCalled());
    unmount();
    expect(fakeChannel.unbind).toHaveBeenCalledWith('new-message', expect.any(Function));
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('provider sans userId (session en cours de chargement) : inerte', () => {
    const { result } = renderHook(() => useUnread(), {
      wrapper: ({ children }) => <UnreadProvider userId={undefined}>{children}</UnreadProvider>,
    });
    expect(result.current.hasUnread).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockSubscribeUserChannel).not.toHaveBeenCalled();
  });

  it("hors provider : état vide, aucun fetch, aucun abonnement", () => {
    const { result } = renderHook(() => useUnread());
    expect(result.current.hasUnread).toBe(false);
    expect(result.current.isUnread('c1')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockSubscribeUserChannel).not.toHaveBeenCalled();
  });

  it('une réponse en erreur laisse l’état précédent, sans lever', async () => {
    const { result } = renderHook(() => useUnread(), { wrapper });
    await waitFor(() => expect(result.current.hasUnread).toBe(true));
    fetchMock.mockImplementation(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }));
    act(() => { window.dispatchEvent(new Event('libre:unread-changed')); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(result.current.hasUnread).toBe(true);
  });
});
