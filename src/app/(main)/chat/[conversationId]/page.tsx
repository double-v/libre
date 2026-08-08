'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Pusher from 'pusher-js';
import { encryptMessage, decryptMessage } from '@/lib/crypto';
import Image from 'next/image';
import { photoUrl } from '@/lib/photos';
import { useEncryptedChat } from '@/hooks/useEncryptedChat';
import ShareContactButton from '@/components/ShareContactButton';
import { mergeMessages } from '@/lib/chat-messages';
import ProfileModal from '@/components/ProfileModal';
import { CheckinButton } from '@/components/CheckinButton';
import ChatMessageList from '@/components/chat/ChatMessageList';

// Taille de page (miroir du défaut serveur, #200). On ne charge/déchiffre que
// cette tranche au départ ; le scroll-up charge les plus anciennes.
const PAGE_SIZE = 50;

// Index de base Virtuoso pour le prepend (#200, chantier 4) : on le décrémente du
// nombre d'items préfixés au scroll-up → Virtuoso préserve la position sans saut.
// Valeur haute pour ne jamais passer sous 0 (des milliers de tranches de marge).
const VIRTUOSO_START_INDEX = 1_000_000;

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
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  // Ancre de prepend Virtuoso (#200) : décrémentée du nombre d'anciens préfixés.
  const [firstItemIndex, setFirstItemIndex] = useState(VIRTUOSO_START_INDEX);

  const { privateKey, publicKey, ready } = useEncryptedChat();
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

  // ─── Load conversation & messages ────────────────────────────────
  // (Le scroll — départ en bas, stick-to-bottom, prepend sans saut — est porté
  //  par `ChatMessageList`/Virtuoso : plus de gestion manuelle de scrollTop ici.)

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
      setFirstItemIndex(VIRTUOSO_START_INDEX); // reset l'ancre pour un fil neuf

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
    try {
      const res = await fetch(
        `/api/chat/${conversationId}/messages?cursor=${encodeURIComponent(nextCursor)}&limit=${PAGE_SIZE}`,
      );
      if (!res.ok) throw new Error('Failed to fetch older messages');
      const data = await res.json();
      const older: Message[] = data.messages || [];
      const decrypted = await applyDecryption(older);
      // Prepend + dédoublonnage/retri (mergeMessages) : pas de doublon ni de trou.
      setMessages((prev) => mergeMessages(decrypted, prev));
      setNextCursor(data.nextCursor ?? null);
      // La pagination curseur (skip:1 + cursor) renvoie une tranche strictement
      // plus ancienne, sans recouvrement → `older.length` items sont préfixés. On
      // décrémente l'ancre Virtuoso d'autant : la position de lecture est préservée
      // sans toucher à `scrollTop` (Virtuoso ré-ancre sur `firstItemIndex`).
      if (older.length > 0) setFirstItemIndex((f) => f - older.length);
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

      {/* Messages list — virtualisée (#200, chantier 4). Toute la mécanique de
          rendu + scroll (départ en bas, stick-to-bottom, prepend sans saut, menu
          « … », tombstone, badge partage) vit dans ce composant présentationnel. */}
      <ChatMessageList
        messages={messages}
        otherUserId={otherUser?.id}
        otherUserName={otherUser?.displayName ?? 'Cette personne'}
        firstItemIndex={firstItemIndex}
        hasOlder={nextCursor != null}
        loadingOlder={loadingOlder}
        onLoadOlder={loadOlder}
        onDelete={handleDelete}
      />

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
