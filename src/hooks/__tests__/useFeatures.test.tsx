/**
 * #418 — useFeatures : optimiste, une seule requête partagée, repli sur panne.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFeatures, _resetFeaturesCache } from '@/hooks/useFeatures';

beforeEach(() => {
  _resetFeaturesCache();
  vi.restoreAllMocks();
});

describe('useFeatures', () => {
  it('répond « tout activé » d’abord, puis l’état du serveur', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ checkin: true, crossings: false, square: true }) }));
    const { result } = renderHook(() => useFeatures());
    expect(result.current.crossings).toBe(true);
    await waitFor(() => expect(result.current.crossings).toBe(false));
  });

  it('une seule requête pour plusieurs consommateurs', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ checkin: true, crossings: true, square: false }) });
    vi.stubGlobal('fetch', fetchSpy);
    const a = renderHook(() => useFeatures());
    const b = renderHook(() => useFeatures());
    await waitFor(() => expect(a.result.current.square).toBe(false));
    await waitFor(() => expect(b.result.current.square).toBe(false));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('sur panne, ne coupe rien', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('réseau')));
    const { result } = renderHook(() => useFeatures());
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current).toEqual({ checkin: true, crossings: true, square: true, journal_comments: false });
  });

  it('une fonctionnalité coupée par défaut ne s’allume que sur un true explicite (spec 007)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ journal_comments: 'oui' }) }));
    const a = renderHook(() => useFeatures());
    expect(a.result.current.journal_comments).toBe(false);
    await new Promise((r) => setTimeout(r, 20));
    expect(a.result.current.journal_comments).toBe(false);
    _resetFeaturesCache();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ journal_comments: true }) }));
    const b = renderHook(() => useFeatures());
    await waitFor(() => expect(b.result.current.journal_comments).toBe(true));
  });

  it('une réponse partielle ou malformée ne coupe rien', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ square: 'non', crossings: false }) }));
    const { result } = renderHook(() => useFeatures());
    await waitFor(() => expect(result.current.crossings).toBe(false));
    expect(result.current.square).toBe(true);
    expect(result.current.checkin).toBe(true);
  });
});
