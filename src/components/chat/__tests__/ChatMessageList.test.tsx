/**
 * Tests — rendu des lignes de la liste de chat virtualisée (#200, chantier 4).
 *
 * La virtualisation (Virtuoso) ne rend rien sous jsdom (pas de layout), donc on
 * teste la logique de rendu des lignes via `MessageRow` (exporté à cette fin) +
 * l'état vide de `ChatMessageList`. Le *comportement* de virtualisation (fenêtrage,
 * départ en bas, prepend sans saut) est validé sur pixels réels (harness Playwright),
 * pas ici.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatMessageList, { MessageRow, type ChatMessage } from '../ChatMessageList';
import { buildShareContactMessage } from '@/lib/shareContact';

const base: ChatMessage = {
  id: 'm1',
  senderId: 'me',
  content: 'Salut, ça va ?',
  createdAt: '2026-01-01T09:00:00Z',
};

function renderRow(overrides: Partial<React.ComponentProps<typeof MessageRow>> = {}) {
  const props = {
    msg: base,
    isSent: true,
    otherUserName: 'Alice',
    menuOpen: false,
    onToggleMenu: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<MessageRow {...props} />) };
}

describe('MessageRow', () => {
  it('rend une bulle envoyée (droite, coral) avec le menu « … »', () => {
    const { container } = renderRow({ isSent: true });
    expect(screen.getByText('Salut, ça va ?')).toBeInTheDocument();
    // Bulle envoyée = alignée à droite + fond terracotta/coral (theme-aware).
    expect(container.querySelector('.justify-end')).not.toBeNull();
    expect(container.querySelector('.bg-terracotta')).not.toBeNull();
    // Menu d'options présent uniquement sur ses propres messages.
    expect(screen.getByRole('button', { name: 'Options du message' })).toBeInTheDocument();
  });

  it('rend une bulle reçue (gauche, neutre) sans menu', () => {
    const { container } = renderRow({ isSent: false });
    expect(container.querySelector('.justify-start')).not.toBeNull();
    expect(container.querySelector('.bg-fill-subtle')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Options du message' })).toBeNull();
  });

  it('rend un tombstone « Message supprimé » pour un message supprimé (jamais le contenu)', () => {
    renderRow({ msg: { ...base, content: '', deletedAt: '2026-01-01T09:05:00Z' } });
    expect(screen.getByText('Message supprimé')).toBeInTheDocument();
    expect(screen.queryByText('Salut, ça va ?')).toBeNull();
    // Pas de menu sur un tombstone.
    expect(screen.queryByRole('button', { name: 'Options du message' })).toBeNull();
  });

  it('rend le badge de partage de réseaux, jamais le JSON brut (#207)', () => {
    const share = buildShareContactMessage();
    renderRow({ msg: { ...base, content: share }, isSent: true });
    expect(screen.getByText(/échanger vos réseaux/i)).toBeInTheDocument();
    expect(screen.queryByText(share)).toBeNull();
  });

  it('appelle onDelete quand « Supprimer » est activé (menu ouvert)', () => {
    const onDelete = vi.fn();
    renderRow({ isSent: true, menuOpen: true, onDelete });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Supprimer' }));
    expect(onDelete).toHaveBeenCalledWith('m1');
  });
});

describe('ChatMessageList — état vide', () => {
  it('invite à démarrer la conversation quand il n’y a aucun message', () => {
    render(
      <ChatMessageList
        messages={[]}
        otherUserName="Alice"
        firstItemIndex={1_000_000}
        hasOlder={false}
        loadingOlder={false}
        onLoadOlder={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('Commencez la conversation !')).toBeInTheDocument();
  });
});
