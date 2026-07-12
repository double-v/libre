'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Pusher from 'pusher-js';
import { encryptMessage, decryptMessage } from '@/lib/crypto';
import Image from 'next/image';
import { photoUrl } from '@/lib/photos';
import { useEncryptedChat } from '@/hooks/useEncryptedChat';
import ShareContactButton from '@/components/ShareContactButton';
import ShareContactNotice from '@/components/ShareContactNotice';
import { isShareContactMessage } from '@/lib/shareContact';
import { mergeMessages } from '@/lib/chat-messages';
import ProfileModal from '@/components/ProfileModal';
import { CheckinButton } from '@/components/CheckinButton';

// Taille de page (miroir du défaut serveur, #200). On ne charge/déchiffre que
// cette tranche au départ ; le scroll-up charge les plus anciennes.
const PAGE_SIZE = 50;

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  deletedAt?: string | null;
}

interface ConversationData {
  id: string;
  matchId: string;
  otherUser: {
    id: string;
    displayName: string;
    photos: string[];
  };
}

interface ProfileData {
  id: string;
  displayName: string;
  publicKey?: string;
  isVerified?: boolean;
}

function getCacheKey(conversationId: string): string {
  return `libre_chat_cache_${conversationId}`;
}

function loadPlaintextCache(conversationId: string): Map<string, string> {
  try {
    const raw = localStorage.getItem(getCacheKey(conversationId));
    if (raw) {
      const obj = JSON.parse(raw);
      return new Map(Object.entries(obj));
    }
  } catch {
    // ignore
  }
  return new Map();
}

function savePlaintextCache(conversationId: string, cache: Map<string, string>): void {
  try {
    const obj = Object.fromEntries(cache.entries());
    localStorage.setItem(getCacheKey(conversationId), JSON.stringify(obj));
  } catch {
    // ignore
  }
}

export default function ChatConversationPage() {
  const params = useParams<{ conversationId: string }>();
  const conversationId = params.conversationId;

  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<ConversationData['otherUser'] | null>(null);
  const [otherPublicKey, setOtherPublicKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const { privateKey, publicKey, ready } = useEncryptedChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Vrai le temps d'un prepend (scroll-up) : évite que l'effet de bas de fil
  // ne ramène brutalement l'utilisateur en bas après l'insertion des anciens.
  const prependingRef = useRef(false);
  const cacheRef = useRef<Map<string, string>>(loadPlaintextCache(conversationId));
  const pendingOwnRef = useRef<Set<string>>(new Set());

  // ─── Decryption helpers ──────────────────────────────────────────

  const tryDecrypt = useCallback(
    async (content: string): Promise<string> => {
      if (!privateKey || !otherPublicKey) return content;
      if (!/^[A-Za-z0-9+/]+=*$/.test(content) || content.length < 30) return content;
      try {
        return await decryptMessage(content, otherPublicKey, privateKey);
      } catch {
        return content;
      }
    },
    [privateKey, otherPublicKey],
  );

  // Decrypt a batch of messages; cache results; update localStorage
  const applyDecryption = useCallback(
    async (msgs: Message[]): Promise<Message[]> => {
      if (!privateKey || !otherPublicKey) return msgs;
      const cache = cacheRef.current;
      const decrypted = await Promise.all(
        msgs.map(async (msg) => {
          const cached = cache.get(msg.id);
          if (cached != null) return { ...msg, content: cached };
          const plain = await tryDecrypt(msg.content);
          if (plain !== msg.content) cache.set(msg.id, plain);
          return { ...msg, content: plain };
        }),
      );
      savePlaintextCache(conversationId, cache);
      return decrypted;
    },
    [privateKey, otherPublicKey, conversationId, tryDecrypt],
  );

  // ─── Scroll ──────────────────────────────────────────────────────

  useEffect(() => {
    // Après un chargement de messages plus anciens (prepend), on ne scrolle pas
    // en bas : la position est préservée par loadOlder. On consomme le flag.
    if (prependingRef.current) {
      prependingRef.current = false;
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ─── Load conversation & messages ────────────────────────────────

  const loadConversation = useCallback(async () => {
    try {
      const convoRes = await fetch(`/api/chat/${conversationId}`);
      if (!convoRes.ok) throw new Error('Failed to fetch conversation');
      const convoData: ConversationData = await convoRes.json();
      setOtherUser(convoData.otherUser);

      const profileRes = await fetch(`/api/users/${convoData.otherUser.id}`);
      if (profileRes.ok) {
        const profileData: ProfileData = await profileRes.json();
        setOtherPublicKey(profileData.publicKey ?? null);
      }

      // Page initiale : uniquement les ~50 plus récents (#200). On ne déchiffre
      // que cette tranche ; les plus anciens se chargent au scroll-up.
      const msgRes = await fetch(`/api/chat/${conversationId}/messages?limit=${PAGE_SIZE}`);
      if (!msgRes.ok) throw new Error('Failed to fetch messages');
      const msgData = await msgRes.json();
      const base: Message[] = msgData.messages || [];
      setNextCursor(msgData.nextCursor ?? null);

      // First render raw (fast), then decrypt in background
      setMessages(base);
      const decrypted = await applyDecryption(base);
      setMessages(decrypted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [conversationId, applyDecryption]);

  // ─── Charger les messages plus anciens (scroll-up paginé, #200) ──────────

  const loadOlder = useCallback(async () => {
    if (!nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    const container = listRef.current;
    const prevHeight = container?.scrollHeight ?? 0;
    const prevTop = container?.scrollTop ?? 0;
    try {
      const res = await fetch(
        `/api/chat/${conversationId}/messages?cursor=${encodeURIComponent(nextCursor)}&limit=${PAGE_SIZE}`,
      );
      if (!res.ok) throw new Error('Failed to fetch older messages');
      const data = await res.json();
      const older: Message[] = data.messages || [];
      const decrypted = await applyDecryption(older);
      // Prepend + dédoublonnage/retri (mergeMessages) : pas de doublon ni de trou.
      prependingRef.current = true;
      setMessages((prev) => mergeMessages(decrypted, prev));
      setNextCursor(data.nextCursor ?? null);
      // Préserve la position de lecture : le contenu inséré au-dessus décale la
      // hauteur — on ré-ancre le scroll sur le delta après le rendu.
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = prevTop + (container.scrollHeight - prevHeight);
        }
      });
    } catch {
      setError('Impossible de charger les messages plus anciens');
    } finally {
      setLoadingOlder(false);
    }
  }, [nextCursor, loadingOlder, conversationId, applyDecryption]);

  useEffect(() => {
    // IIFE async → pas de setState synchrone dans le corps de l'effet
    // (react-hooks/set-state-in-effect, cf. #179/#193).
    void (async () => {
      await loadConversation();
    })();
  }, [loadConversation]);

  // ─── Pusher realtime ─────────────────────────────────────────────

  useEffect(() => {
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    if (!pusherKey) return;

    const pusher = new Pusher(pusherKey, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
      channelAuthorization: {
        endpoint: '/api/pusher/auth',
        transport: 'ajax',
      },
    });

    const channelName = `private-chat-${conversationId}`;
    const channel = pusher.subscribe(channelName);

    // Re-fetch + déchiffrement, partagé par new-message et message-deleted.
    // Sous pagination (#200) on ne recharge que la page la plus récente et on la
    // fusionne dans le fil déjà chargé (mergeMessages) : les tranches anciennes
    // déjà affichées sont conservées, pas de rechargement complet ni de trou.
    const refetch = () => {
      fetch(`/api/chat/${conversationId}/messages?limit=${PAGE_SIZE}`)
        .then((res) => res.json())
        .then(async (msgData) => {
          if (msgData.messages) {
            const base: Message[] = msgData.messages;
            const decrypted = await applyDecryption(base);
            setMessages((prev) => mergeMessages(prev, decrypted));
          }
        })
        .catch(() => {});
    };

    channel.bind('new-message', refetch);
    // Suppression d'un message par son auteur (#201) : l'autre côté re-fetch et
    // voit le tombstone en temps réel.
    channel.bind('message-deleted', refetch);

    return () => {
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [conversationId, applyDecryption]);

  // ─── Send message ────────────────────────────────────────────────

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || sending) return;

    setSending(true);
    setError('');
    try {
      let content = text;
      if (otherPublicKey && privateKey) {
        content = await encryptMessage(text, otherPublicKey, privateKey);
      }

      const res = await fetch(`/api/chat/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send message');
      }

      const msgData = await res.json();
      if (msgData.message?.id) {
        // 1. Cache own plaintext
        cacheRef.current.set(msgData.message.id, text);
        savePlaintextCache(conversationId, cacheRef.current);
        // 2. Optimistic UI
        const optimistic: Message = {
          ...msgData.message,
          content: text,
        };
        setMessages((prev) => {
          if (prev.some((m) => m.id === optimistic.id)) return prev;
          return [...prev, optimistic];
        });
      }
      setInputText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'envoyer");
    } finally {
      setSending(false);
    }
  };

  // Send message from ShareContactButton
  const handleShareContact = async (content: string) => {
    try {
      const res = await fetch(`/api/chat/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) throw new Error('Failed to send');

      const msgData = await res.json();
      if (msgData.message?.id) {
        cacheRef.current.set(msgData.message.id, content);
        savePlaintextCache(conversationId, cacheRef.current);
        setMessages((prev) => {
          if (prev.some((m) => m.id === msgData.message.id)) return prev;
          return [...prev, { ...msgData.message, content }];
        });
      }
    } catch {
      setError("Impossible d'envoyer le message de partage");
    }
  };

  // ─── Delete own message ──────────────────────────────────────────

  const handleDelete = async (id: string) => {
    setMenuOpenId(null);
    try {
      const res = await fetch(`/api/chat/${conversationId}/messages/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('delete failed');
      // Optimistic : marquer supprimé localement (tombstone immédiat).
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, content: '', deletedAt: new Date().toISOString() } : m,
        ),
      );
      // Purge le clair du cache local : ne jamais ré-afficher un message supprimé.
      cacheRef.current.delete(id);
      savePlaintextCache(conversationId, cacheRef.current);
    } catch {
      setError('Impossible de supprimer le message');
    }
  };

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

  // ─── UI helpers ──────────────────────────────────────────────────

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const e2eEnabled = !!(privateKey && otherPublicKey);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-lg flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-hairline p-4">
        <div
          className="flex flex-1 min-w-0 cursor-pointer items-center gap-3"
          onClick={() => otherUser && setSelectedUserId(otherUser.id)}
        >
          {otherUser?.photos?.[0] ? (
            <Image
              src={photoUrl(otherUser.photos[0])}
              alt={otherUser.displayName}
              width={40}
              height={40}
              className="rounded-full object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fill-subtle text-sm font-bold">
              {otherUser?.displayName?.[0] ?? '?'}
            </div>
          )}
          <h1 className="truncate text-lg font-bold text-content">
            {otherUser?.displayName ?? 'Utilisateur'}
          </h1>
        </div>
        {otherUser && (
          <div className="flex items-center gap-2">
            <CheckinButton />
            <ShareContactButton conversationId={conversationId} onSend={handleShareContact} />
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-2 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* E2E status */}
      {!e2eEnabled && (
        <div className="mx-4 mt-2 rounded-md bg-yellow-50 p-2 text-xs text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
          {!otherPublicKey
            ? "Le chiffrement de bout en bout n'est pas disponible (l'autre utilisateur n'a pas encore de clés)"
            : "Vos clés de chiffrement sont en cours d'initialisation…"}
        </div>
      )}

      {/* Messages list */}
      <div
        ref={listRef}
        aria-live="polite"
        aria-label="Messages de la conversation"
        className="flex-1 space-y-2 overflow-y-auto p-4"
      >
        {/* Charger les plus anciens (pagination par curseur, #200) */}
        {nextCursor &&
          (loadingOlder ? (
            <div className="space-y-2 pb-1" aria-hidden="true">
              <div className="h-8 w-2/3 animate-pulse rounded-2xl bg-fill-subtle motion-reduce:animate-none" />
              <div className="ml-auto h-8 w-1/2 animate-pulse rounded-2xl bg-fill-subtle motion-reduce:animate-none" />
            </div>
          ) : (
            <div className="flex justify-center pb-1">
              <button
                type="button"
                onClick={loadOlder}
                className="rounded-full border border-hairline-strong px-4 py-1.5 text-xs font-medium text-muted hover:bg-fill-subtle focus-visible:outline-none focus-visible:shadow-focus"
              >
                Charger les messages plus anciens
              </button>
            </div>
          ))}
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted">
            Commencez la conversation !
          </p>
        )}
        {messages.map((msg) => {
          const isSent = msg.senderId !== otherUser?.id;

          // Message supprimé par son auteur → tombstone (prioritaire sur le
          // badge partage-réseaux). Les deux côtés voient « Message supprimé ».
          if (msg.deletedAt) {
            return (
              <div key={msg.id} className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[80%] rounded-2xl bg-fill-subtle px-4 py-2">
                  <p className="break-words text-sm italic text-muted">
                    Message supprimé
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          }

          // Partage de réseaux : badge système, jamais le JSON brut (issue #207).
          if (isShareContactMessage(msg.content)) {
            return (
              <ShareContactNotice
                key={msg.id}
                isSent={isSent}
                otherName={otherUser?.displayName ?? 'Cette personne'}
              />
            );
          }
          return (
            <div
              key={msg.id}
              className={`group flex items-end gap-1 ${isSent ? 'justify-end' : 'justify-start'}`}
            >
              {/* Menu « … » — uniquement sur ses propres messages, atteignable au
                  clavier (bouton focusable), pas seulement à l'appui long. */}
              {isSent && (
                <div className="relative">
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={menuOpenId === msg.id}
                    aria-label="Options du message"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId((prev) => (prev === msg.id ? null : msg.id));
                    }}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted opacity-0 transition-opacity duration-[var(--motion-fast)] hover:bg-fill-subtle hover:text-muted focus-visible:opacity-100 focus-visible:outline-none focus-visible:shadow-focus group-hover:opacity-100 motion-reduce:transition-none"
                  >
                    <span aria-hidden="true">⋯</span>
                  </button>
                  {menuOpenId === msg.id && (
                    <div
                      role="menu"
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-9 right-0 z-10 min-w-[8rem] overflow-hidden rounded-lg border border-hairline bg-surface shadow-pop"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleDelete(msg.id)}
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
                  isSent
                    ? 'bg-terracotta text-white dark:bg-coral dark:text-white'
                    : 'bg-fill-subtle text-content'
                }`}
              >
                <p className="break-words text-sm">{msg.content}</p>
                <p
                  className={`mt-1 text-xs ${
                    isSent
                      ? 'text-white/60'
                      : 'text-muted'
                  }`}
                >
                  {formatTime(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-hairline p-4">
        <form onSubmit={handleSend} aria-label="Envoyer un message" className="flex gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Votre message
          </label>
          <input
            id="chat-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Message..."
            maxLength={1000}
            disabled={sending}
            className="flex-1 rounded-full border border-hairline-strong px-4 py-2 text-sm focus:border-coral focus:outline-none focus:ring-coral disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={sending || !inputText.trim()}
            className="rounded-full bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-coral-dark disabled:opacity-50 dark:bg-coral dark:hover:bg-terracotta"
          >
            Envoyer
          </button>
        </form>
      </div>
      <ProfileModal
        userId={selectedUserId ?? ''}
        open={!!selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />
    </div>
  );
}
