/**
 * #417 — l'en-tête du fil : le prénom sur sa ligne, les actions dans un « ⋯ ».
 *
 * Ce test ne voit pas les pixels (la troncature se vérifie sur l'app servie),
 * mais il garde la structure : aucune action inline dans l'en-tête, un seul
 * menu, les deux actions dedans, et le check-in qui s'ouvre depuis le menu.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/navigation', () => ({
  useParams: () => ({ conversationId: 'conv-1' }),
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));
vi.mock('next/image', () => ({ default: (p: { alt: string }) => <span role="img" aria-label={p.alt} /> }));
vi.mock('next/link', () => ({ default: (p: { children: React.ReactNode }) => <a>{p.children}</a> }));
vi.mock('@/lib/pusher-client', () => ({ subscribeChannel: () => null }));
vi.mock('@/hooks/useEncryptedChat', () => ({
  useEncryptedChat: () => ({ publicKey: 'PUB_MOI', privateKey: 'PRIV_MOI', ready: true, etat: 'pret' }),
}));
vi.mock('@/lib/crypto', () => ({
  encryptMessage: vi.fn(async (t: string) => t),
  decryptMessageAvecHistorique: vi.fn(async (t: string) => t),
}));
vi.mock('@/components/chat/ChatMessageList', () => ({ default: () => <ul data-testid="fil" /> }));
vi.mock('@/components/ProfileModal', () => ({ default: () => null }));

import ChatPage from '../page';

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      const json = (body: unknown, status = 200) =>
        Promise.resolve({ ok: status < 300, status, json: async () => body } as Response);
      if (url === '/api/chat/conv-1') return json({ otherUser: { id: 'u2', displayName: 'Marie-Bernadette', photos: [] } });
      if (url === '/api/users/u2') return json({ id: 'u2', displayName: 'Marie-Bernadette', publicKey: 'PUB_PAIR' });
      if (url.startsWith('/api/chat/conv-1/messages')) return json({ messages: [], nextCursor: null });
      if (url === '/api/circle/check-in/active') return json(null, 204);
      return json({});
    }),
  );
});

describe('en-tête du fil (#417)', () => {
  it('porte le prénom, un seul « ⋯ », et aucune action inline', async () => {
    render(<ChatPage />);
    expect(await screen.findByRole('heading', { name: 'Marie-Bernadette' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Plus d’actions' })).toBeInTheDocument();
    expect(screen.queryByText(/On échange nos réseaux/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Activer un check-in/)).not.toBeInTheDocument();
  });

  it('le menu liste les deux actions, et le check-in s’ouvre depuis le menu', async () => {
    const user = userEvent.setup();
    render(<ChatPage />);
    await user.click(await screen.findByRole('button', { name: 'Plus d’actions' }));

    const menu = screen.getByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: 'On échange nos réseaux ?' })).toBeInTheDocument();
    await user.click(within(menu).getByRole('menuitem', { name: 'Activer un check-in de sécurité' }));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getByText('30 min')).toBeInTheDocument();
  });
});
