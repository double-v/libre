/**
 * Tests — le journal de modération parle français (revue PR #466).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminLogsPage from '../page';

afterEach(() => vi.unstubAllGlobals());

describe('/admin/logs', () => {
  it('affiche « Réponse retirée » pour un retrait de réponse, jamais la clé brute', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      logs: [{ id: 'l1', action: 'REMOVE_ANSWER', reason: 'fait-rire', createdAt: '2026-09-26T10:00:00Z', admin: { id: 'a', displayName: 'Admin' }, targetUser: { id: 'u', displayName: 'Noor' } }],
      total: 1,
    }))));
    render(<AdminLogsPage />);
    expect(await screen.findByText('Réponse retirée')).toBeInTheDocument();
    expect(screen.queryByText('REMOVE_ANSWER')).toBeNull();
  });
});
