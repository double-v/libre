/**
 * Tests — useUnread / UnreadProvider (#389, spec 003 R5).
 *
 * L'état « non lu » est chargé depuis la base (source de vérité) et
 * resynchronisé sur trois signaux : l'événement temps réel `new-message` du
 * canal utilisateur, le retour au premier plan, et l'événement DOM
 * `libre:unread-changed` émis par la page de conversation après marquage lu.
 * Hors provider (landing, admin), le hook rend un état vide sans lever : le
 * SiteNav y est monté aussi.
 *
 * Badge d'icône (#390, spec 003 US2) : même information, une surface de plus.
 * Le provider pose ou retire le badge quand la présence de non-lus change —
 * jamais avant le premier chargement (on ne sait rien), jamais en double.
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

const mockSetBadge = vi.fn().mockResolvedValue(undefined);
const mockClearBadge = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/app-badge', () => ({
  __esModule: true,
  setBadge: () => mockSetBadge(),
  clearBadge: () => mockClearBadge(),
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

  it('un signal reçu pendant un chargement est rejoué après, pas perdu', async () => {
    // Scénario : conversation ouverte, un message arrive. `new-message` lance
    // un GET unread qui peut lire AVANT que `GET messages` ait posé readAt ;
    // puis la page émet `libre:unread-changed` pendant que ce GET est en vol.
    // Sans rejeu, la réponse périmée allume une pastille sur la conversation
    // qu'on est en train de lire, sans rien pour l'éteindre.
    let resolveFirst: (v: unknown) => void = () => {};
    const { result } = renderHook(() => useUnread(), { wrapper });
    await waitFor(() => expect(result.current.hasUnread).toBe(true));

    fetchMock.mockImplementationOnce(() => new Promise((r) => { resolveFirst = r; }));
    act(() => bound['new-message']?.({ conversationId: 'c1' }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // Pendant le vol : la page a marqué lu.
    fetchMock.mockImplementation(() => respond([]));
    act(() => { window.dispatchEvent(new Event('libre:unread-changed')); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // La réponse périmée arrive : elle dit « c1 non lu ».
    await act(async () => { resolveFirst({ ok: true, json: () => Promise.resolve({ conversationIds: ['c1'] }) }); });
    // Le signal reçu en vol est rejoué et corrige l'état.
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(result.current.hasUnread).toBe(false));
  });

  it('une réponse en erreur laisse l’état précédent, sans lever', async () => {
    const { result } = renderHook(() => useUnread(), { wrapper });
    await waitFor(() => expect(result.current.hasUnread).toBe(true));
    fetchMock.mockImplementation(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }));
    act(() => { window.dispatchEvent(new Event('libre:unread-changed')); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(result.current.hasUnread).toBe(true);
  });

  describe('badge d’icône (#390)', () => {
    it('pose le badge quand des non-lus arrivent, sans le poser en double', async () => {
      const { result } = renderHook(() => useUnread(), { wrapper });
      await waitFor(() => expect(result.current.hasUnread).toBe(true));
      expect(mockSetBadge).toHaveBeenCalledTimes(1);
      expect(mockClearBadge).not.toHaveBeenCalled();
      // Un second non-lu ne change pas la présence : le badge est déjà posé.
      fetchMock.mockImplementation(() => respond(['c1', 'c2']));
      act(() => bound['new-message']?.({ conversationId: 'c2' }));
      await waitFor(() => expect(result.current.isUnread('c2')).toBe(true));
      expect(mockSetBadge).toHaveBeenCalledTimes(1);
    });

    it('retire le badge quand tout est lu, une seule fois', async () => {
      const { result } = renderHook(() => useUnread(), { wrapper });
      await waitFor(() => expect(result.current.hasUnread).toBe(true));
      fetchMock.mockImplementation(() => respond([]));
      act(() => { window.dispatchEvent(new Event('libre:unread-changed')); });
      await waitFor(() => expect(result.current.hasUnread).toBe(false));
      expect(mockClearBadge).toHaveBeenCalledTimes(1);
      // Une resync qui confirme « rien à lire » ne retire pas le badge à nouveau.
      act(() => { window.dispatchEvent(new Event('libre:unread-changed')); });
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
      expect(mockClearBadge).toHaveBeenCalledTimes(1);
      expect(mockSetBadge).toHaveBeenCalledTimes(1);
    });

    it('ne touche pas au badge avant le premier chargement ni sans session', async () => {
      fetchMock.mockImplementation(() => respond([]));
      const { result } = renderHook(() => useUnread(), { wrapper });
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(mockClearBadge).toHaveBeenCalledTimes(1));
      expect(result.current.hasUnread).toBe(false);
      expect(mockSetBadge).not.toHaveBeenCalled();

      mockClearBadge.mockClear();
      renderHook(() => useUnread(), {
        wrapper: ({ children }) => <UnreadProvider userId={undefined}>{children}</UnreadProvider>,
      });
      expect(mockSetBadge).not.toHaveBeenCalled();
      expect(mockClearBadge).not.toHaveBeenCalled();
    });
  });
});
