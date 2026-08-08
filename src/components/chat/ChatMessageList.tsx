'use client';

import { useCallback, useEffect, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import ShareContactNotice from '@/components/ShareContactNotice';
import { isShareContactMessage } from '@/lib/shareContact';

/**
 * Liste de messages **virtualisée** (chantier 4 de #200).
 *
 * Composant présentationnel pur : la page (`chat/[conversationId]`) garde toute la
 * logique data/crypto/pusher et ne fait que passer les messages déjà déchiffrés +
 * les callbacks. La virtualisation (`react-virtuoso`) plafonne le nombre de nœuds
 * DOM même sur un fil très long chargé par scroll-up successifs.
 *
 * Virtuoso remplace la mécanique de scroll hand-rollée de la page :
 * - **stick-to-bottom** sur nouveau message → `followOutput` (uniquement si déjà en bas) ;
 * - **prepend sans saut** au chargement des plus anciens → `firstItemIndex` (décrémenté
 *   par la page à chaque tranche préfixée) ; plus de ré-ancrage manuel de `scrollTop` ;
 * - **départ en bas** → `initialTopMostItemIndex` (la liste ne monte qu'une fois les
 *   messages chargés, cf. garde `loading` de la page).
 *
 * L'UX de chargement des anciens (bouton + skeleton) reste **inchangée** — elle est
 * rendue dans le `Header` de Virtuoso. Zéro hex inline, cibles ≥ 44px, motion-reduce.
 */
export interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  deletedAt?: string | null;
}

interface HeaderContext {
  hasOlder: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
}

export interface ChatMessageListProps {
  /** Messages déchiffrés, ordre chronologique (plus ancien → plus récent). */
  messages: ChatMessage[];
  /** Id de l'autre participant — sert à distinguer envoyé/reçu. */
  otherUserId?: string;
  /** Nom de l'autre participant — pour le badge de partage de réseaux. */
  otherUserName: string;
  /** Index Virtuoso du 1er item : la page le décrémente du nombre d'items préfixés. */
  firstItemIndex: number;
  /** Reste-t-il des messages plus anciens à charger ? (`nextCursor != null`) */
  hasOlder: boolean;
  /** Chargement d'une tranche plus ancienne en cours (skeleton). */
  loadingOlder: boolean;
  /** Déclenche le chargement de la tranche plus ancienne (bouton). */
  onLoadOlder: () => void;
  /** Supprime un de ses propres messages (appel API porté par la page). */
  onDelete: (id: string) => void;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * En-tête de la liste : chargement des messages plus anciens (bouton → skeleton).
 * Composant stable (module scope) lu via le `context` de Virtuoso — évite un
 * remount de l'en-tête à chaque render.
 */
function LoadOlderHeader({ context }: { context?: HeaderContext }) {
  if (!context?.hasOlder) return <div className="h-4" aria-hidden="true" />;
  const { loadingOlder, onLoadOlder } = context;
  return (
    <div className="px-4 pt-4 pb-2">
      {loadingOlder ? (
        <div className="space-y-2 pb-1" aria-hidden="true">
          <div className="h-8 w-2/3 animate-pulse rounded-2xl bg-fill-subtle motion-reduce:animate-none" />
          <div className="ml-auto h-8 w-1/2 animate-pulse rounded-2xl bg-fill-subtle motion-reduce:animate-none" />
        </div>
      ) : (
        <div className="flex justify-center pb-1">
          <button
            type="button"
            onClick={onLoadOlder}
            className="min-h-[44px] rounded-full border border-hairline-strong px-4 text-xs font-medium text-muted hover:bg-fill-subtle focus-visible:outline-none focus-visible:shadow-focus"
          >
            Charger les messages plus anciens
          </button>
        </div>
      )}
    </div>
  );
}

interface MessageRowProps {
  msg: ChatMessage;
  isSent: boolean;
  otherUserName: string;
  menuOpen: boolean;
  onToggleMenu: (id: string) => void;
  onDelete: (id: string) => void;
}

/** Une ligne de message : tombstone, badge de partage, ou bulle (+ menu si envoyé).
 *  Exporté pour test unitaire (jsdom) : Virtuoso ne rend rien sans layout, donc la
 *  logique de rendu des lignes se teste ici, hors virtualisation. */
export function MessageRow({ msg, isSent, otherUserName, menuOpen, onToggleMenu, onDelete }: MessageRowProps) {
  // Message supprimé par son auteur → tombstone (prioritaire sur le badge partage).
  if (msg.deletedAt) {
    return (
      <div className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
        <div className="max-w-[80%] rounded-2xl bg-fill-subtle px-4 py-2">
          <p className="break-words text-sm italic text-muted">Message supprimé</p>
          <p className="mt-1 text-xs text-muted">{formatTime(msg.createdAt)}</p>
        </div>
      </div>
    );
  }

  // Partage de réseaux : badge système, jamais le JSON brut (issue #207).
  if (isShareContactMessage(msg.content)) {
    return <ShareContactNotice isSent={isSent} otherName={otherUserName} />;
  }

  return (
    <div className={`group flex items-end gap-1 ${isSent ? 'justify-end' : 'justify-start'}`}>
      {/* Menu « … » — uniquement sur ses propres messages, atteignable au clavier. */}
      {isSent && (
        <div className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Options du message"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMenu(msg.id);
            }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted opacity-0 transition-opacity duration-[var(--motion-fast)] hover:bg-fill-subtle hover:text-muted focus-visible:opacity-100 focus-visible:outline-none focus-visible:shadow-focus group-hover:opacity-100 motion-reduce:transition-none"
          >
            <span aria-hidden="true">⋯</span>
          </button>
          {menuOpen && (
            <div
              role="menu"
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-9 right-0 z-10 min-w-[8rem] overflow-hidden rounded-lg border border-hairline bg-surface shadow-pop"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => onDelete(msg.id)}
                className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 focus-visible:bg-red-50 focus-visible:outline-none dark:text-red-400 dark:hover:bg-red-900/30 dark:focus-visible:bg-red-900/30"
              >
                Supprimer
              </button>
            </div>
          )}
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
          isSent ? 'bg-terracotta text-white dark:bg-coral dark:text-white' : 'bg-fill-subtle text-content'
        }`}
      >
        <p className="break-words text-sm">{msg.content}</p>
        <p className={`mt-1 text-xs ${isSent ? 'text-white/60' : 'text-muted'}`}>{formatTime(msg.createdAt)}</p>
      </div>
    </div>
  );
}

export default function ChatMessageList({
  messages,
  otherUserId,
  otherUserName,
  firstItemIndex,
  hasOlder,
  loadingOlder,
  onLoadOlder,
  onDelete,
}: ChatMessageListProps) {
  // État UI local de la liste : quel menu « … » est ouvert.
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const toggleMenu = useCallback(
    (id: string) => setMenuOpenId((prev) => (prev === id ? null : id)),
    [],
  );
  const handleDelete = useCallback(
    (id: string) => {
      setMenuOpenId(null);
      onDelete(id);
    },
    [onDelete],
  );

  // Ferme le menu « … » au clavier (Échap) ou au clic en dehors.
  useEffect(() => {
    if (!menuOpenId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpenId(null);
    };
    const onClick = () => setMenuOpenId(null);
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  }, [menuOpenId]);

  const itemContent = useCallback(
    (_index: number, msg: ChatMessage) => (
      <div className="px-4 pb-2">
        <MessageRow
          msg={msg}
          isSent={msg.senderId !== otherUserId}
          otherUserName={otherUserName}
          menuOpen={menuOpenId === msg.id}
          onToggleMenu={toggleMenu}
          onDelete={handleDelete}
        />
      </div>
    ),
    [otherUserId, otherUserName, menuOpenId, toggleMenu, handleDelete],
  );

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-center text-sm text-muted">Commencez la conversation !</p>
      </div>
    );
  }

  return (
    <Virtuoso<ChatMessage, HeaderContext>
      className="flex-1"
      aria-live="polite"
      aria-label="Messages de la conversation"
      data={messages}
      firstItemIndex={firstItemIndex}
      initialTopMostItemIndex={messages.length - 1}
      followOutput={(atBottom) => (atBottom ? 'smooth' : false)}
      context={{ hasOlder, loadingOlder, onLoadOlder }}
      components={{ Header: LoadOlderHeader, Footer: ListFooter }}
      itemContent={itemContent}
    />
  );
}

/** Respiration en bas de liste (remplace l'ancien `p-4` du conteneur). */
function ListFooter() {
  return <div className="h-4" aria-hidden="true" />;
}
