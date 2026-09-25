/**
 * Tests — réponses dans l'écran admin des signalements (spec 009, revue PR #466).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import AdminReportsPage from '../page';

afterEach(() => vi.unstubAllGlobals());

const report = {
  id: 'r1', reason: 'inappropriate', description: '', status: 'pending', createdAt: '2026-09-26T10:00:00Z',
  reporter: { id: 't', displayName: 'Témoin' },
  reported: {
    id: 'a', displayName: 'Auteur', isBanned: false,
    profileAnswers: [{ id: 'x1', questionKey: 'fait-rire', choices: [], text: 'Texte poli.', removedAt: '2026-09-26T09:00:00Z' }],
  },
  answersSnapshot: [{ questionKey: 'fait-rire', choices: [], text: 'Texte injurieux.' }, { questionKey: 'cafe-the', choices: ['the', 'cafe'], text: '' }],
};

describe('/admin/reports — réponses', () => {
  it('montre la preuve figée au signalement, puis les réponses du jour, retirables', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ reports: [report], total: 1 }))));
    render(<AdminReportsPage />);
    const preuve = (await screen.findByText('Ses réponses au moment du signalement')).parentElement!;
    expect(within(preuve).getByText('Texte injurieux.')).toBeInTheDocument();
    expect(within(preuve).getByText('Café · Thé')).toBeInTheDocument();
    expect(within(preuve).queryByRole('button', { name: 'Retirer cette réponse' })).toBeNull();

    const jour = screen.getByText('Ses réponses aujourd’hui').parentElement!;
    expect(within(jour).getByText('Texte poli.')).toBeInTheDocument();
    expect(within(jour).getByText('Réécrite après un retrait')).toBeInTheDocument();
    expect(within(jour).getByRole('button', { name: 'Retirer cette réponse' })).toBeInTheDocument();
  });
});
