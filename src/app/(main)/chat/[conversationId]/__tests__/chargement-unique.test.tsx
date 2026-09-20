/**
 * #419 — le fil se charge une fois, pas en boucle.
 *
 * `loadConversation` dépend de la chaîne de déchiffrement, qui dépend d'états
 * que `loadConversation` pose lui-même (clés du pair). Si l'un d'eux est posé
 * avec une référence neuve mais égale (`[]`), l'effet de chargement se relance
 * à l'infini : refetch permanent, fil qui clignote (vu sous Firefox, prod du
 * 2026-09-20). Ce test compte les appels réseau après stabilisation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
const encryptMessage = vi.fn(async (t: string, clePair: string) => `chiffre-pour:${clePair}:${t}`);
vi.mock('@/lib/crypto', () => ({
  encryptMessage: (t: string, clePair: string) => encryptMessage(t, clePair),
  decryptMessageAvecHistorique: vi.fn(async (t: string) => t),
}));
vi.mock('@/components/chat/ChatMessageList', () => ({
  default: (p: { messages: { id: string }[] }) => <ul data-testid="fil">{p.messages.map((m) => <li key={m.id} />)}</ul>,
}));
vi.mock('@/components/ProfileModal', () => ({ default: () => null }));
vi.mock('@/components/CheckinButton', () => ({ CheckinButton: () => null }));
vi.mock('@/components/ShareContactButton', () => ({ default: () => null }));

import ChatPage from '../page';

let appels: string[];
let clePublique: string;
let envois: string[];

beforeEach(() => {
  appels = [];
  envois = [];
  clePublique = 'PUB_PAIR';
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) => {
      appels.push(url);
      const json = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: async () => body } as Response);
      if (url === '/api/chat/conv-1') return json({ otherUser: { id: 'u2', displayName: 'Camille', photos: [] } });
      if (url === '/api/users/u2') return json({ id: 'u2', displayName: 'Camille', publicKey: clePublique });
      if (url.startsWith('/api/chat/conv-1/messages') && init?.method === 'POST') {
        const { content } = JSON.parse(init.body as string);
        envois.push(content);
        return json({ message: { id: `m${envois.length + 1}`, senderId: 'u1', content, createdAt: new Date().toISOString() } });
      }
      if (url.startsWith('/api/chat/conv-1/messages'))
        return json({ messages: [{ id: 'm1', senderId: 'u2', content: 'coucou', createdAt: new Date().toISOString() }], nextCursor: null });
      return json({});
    }),
  );
});

describe('page de conversation — chargement unique (#419)', () => {
  it('ne recharge pas la conversation en boucle une fois les clés du pair posées', async () => {
    render(<ChatPage />);
    await waitFor(() => expect(screen.getByTestId('fil').children).toHaveLength(1));

    // Laisser passer plusieurs tours d'effets : une boucle se manifesterait ici.
    await new Promise((r) => setTimeout(r, 150));

    const chargements = appels.filter((u) => u === '/api/chat/conv-1');
    expect(chargements).toHaveLength(1);
  });

  it('chiffre avec la clé du pair relue à l’envoi — pas celle de l’ouverture (#340)', async () => {
    const user = userEvent.setup();
    render(<ChatPage />);
    await waitFor(() => expect(screen.getByTestId('fil').children).toHaveLength(1));

    // Le pair réinitialise sa clé pendant que ce fil est ouvert.
    clePublique = 'PUB_PAIR_NEUVE';

    await user.type(screen.getByLabelText(/votre message/i), 'salut');
    await user.click(screen.getByRole('button', { name: /envoyer/i }));

    await waitFor(() => expect(envois).toHaveLength(1));
    expect(envois[0]).toBe('chiffre-pour:PUB_PAIR_NEUVE:salut');
  });
});
