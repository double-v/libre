'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Pusher from 'pusher-js';
import { encryptMessage, decryptMessage } from '@/lib/crypto';
import { photoUrl } from '@/lib/photos';
import { useEncryptedChat } from '@/hooks/useEncryptedChat';
import ShareContactButton from '@/components/ShareContactButton';
import ProfileModal from '@/components/ProfileModal';

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
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

  const { privateKey, ready } = useEncryptedChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Attempt to decrypt a message; fall back to raw content
  const tryDecrypt = useCallback(async (content: string, senderId: string): Promise<string> => {
    // Only decrypt if it looks like base64 ciphertext and we have keys
    if (!privateKey || !otherPublicKey) return content;
    // Don't try to decrypt our own messages (they're already plaintext in UI)
    if (senderId !== otherUser?.id) return content;
    // Quick base64 check
    if (!/^[A-Za-z0-9+/]+=*$/.test(content) || content.length < 30) return content;

    try {
      return await decryptMessage(content, otherPublicKey, privateKey);
    } catch {
      // Not encrypted or decryption failed — show as-is
      return content;
    }
  }, [privateKey, otherPublicKey, otherUser?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversation, messages, and other user's public key
  const loadConversation = useCallback(async () => {
    try {
      const convoRes = await fetch(`/api/chat/${conversationId}`);
      if (!convoRes.ok) throw new Error('Failed to fetch conversation');
      const convoData: ConversationData = await convoRes.json();
      setOtherUser(convoData.otherUser);

      // Fetch other user's public key
      const profileRes = await fetch(`/api/users/${convoData.otherUser.id}`);
      if (profileRes.ok) {
        const profileData: ProfileData = await profileRes.json();
        setOtherPublicKey(profileData.publicKey ?? null);
      }

      // Fetch messages
      const msgRes = await fetch(`/api/chat/${conversationId}/messages`);
      if (!msgRes.ok) throw new Error('Failed to fetch messages');
      const msgData = await msgRes.json();
      setMessages(msgData.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  // Decrypt received messages once we have all keys
  useEffect(() => {
    if (!privateKey || !otherPublicKey || messages.length === 0) return;
    const otherId = otherUser?.id;
    if (!otherId) return;

    let cancelled = false;
    (async () => {
      const decrypted = await Promise.all(
        messages.map(async (msg) => {
          if (msg.senderId !== otherId) return msg;
          const decrypted = await tryDecrypt(msg.content, msg.senderId);
          return { ...msg, content: decrypted };
        }),
      );
      if (!cancelled) setMessages(decrypted);
    })();
    return () => { cancelled = true; };
  }, [privateKey, otherPublicKey, messages.length, otherUser?.id, tryDecrypt]);

  // Subscribe to Pusher for real-time messages
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

    channel.bind('new-message', (data: { id: string; senderId: string; createdAt: string }) => {
      fetch(`/api/chat/${conversationId}/messages`)
        .then((res) => res.json())
        .then(async (msgData) => {
          if (msgData.messages) {
            // Decrypt new messages if possible
            const decrypted = await Promise.all(
              msgData.messages.map(async (msg: Message) => {
                if (msg.senderId === otherUser?.id && privateKey && otherPublicKey) {
                  const decrypted = await tryDecrypt(msg.content, msg.senderId);
                  return { ...msg, content: decrypted };
                }
                return msg;
              }),
            );
            setMessages(decrypted);
          }
        })
        .catch(() => {});
    });

    return () => {
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [conversationId, otherUser?.id, privateKey, otherPublicKey, tryDecrypt]);

  // Send a message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      let content = text;

      // Encrypt if both users have keys
      if (otherPublicKey && privateKey) {
        content = await encryptMessage(text, otherPublicKey, privateKey);
      }

      const res = await fetch(`/api/chat/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) throw new Error('Failed to send message');

      const msgData = await res.json();
      if (msgData.message) {
        // Add with plaintext (we know what we sent)
        setMessages((prev) => {
          if (prev.some((m) => m.id === msgData.message.id)) return prev;
          return [...prev, { ...msgData.message, content: text }];
        });
      }

      setInputText('');
    } catch {
      setError("Impossible d'envoyer le message");
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
      if (msgData.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msgData.message.id)) return prev;
          return [...prev, msgData.message];
        });
      }
    } catch {
      setError("Impossible d'envoyer le message de partage");
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const e2eEnabled = !!(privateKey && otherPublicKey);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] max-w-lg flex-col mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 p-4 dark:border-gray-800">
        <div
          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
          onClick={() => otherUser && setSelectedUserId(otherUser.id)}
        >
          {otherUser?.photos?.[0] ? (
            <img src={photoUrl(otherUser.photos[0])} alt={otherUser.displayName} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-300 text-sm font-bold dark:bg-gray-600">
              {otherUser?.displayName?.[0] ?? '?'}
            </div>
          )}
          <h1 className="truncate text-lg font-bold">{otherUser?.displayName ?? 'Utilisateur'}</h1>
        </div>
        {otherUser && (
          <ShareContactButton conversationId={conversationId} onSend={handleShareContact} />
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
      <div aria-live="polite" aria-label="Messages de la conversation" className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            Commencez la conversation !
          </p>
        )}
        {messages.map((msg) => {
          const isSent = msg.senderId !== otherUser?.id;
          return (
            <div
              key={msg.id}
              className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  isSent
                    ? 'bg-terracotta text-white dark:bg-gray-100 dark:text-gray-900'
                    : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                }`}
              >
                <p className="text-sm break-words">{msg.content}</p>
                <p
                  className={`mt-1 text-xs ${
                    isSent
                      ? 'text-white/60 dark:text-gray-500'
                      : 'text-gray-600 dark:text-gray-400'
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
      <div className="border-t border-gray-200 p-4 dark:border-gray-800">
        <form onSubmit={handleSend} aria-label="Envoyer un message" className="flex gap-2">
          <label htmlFor="chat-input" className="sr-only">Votre message</label>
          <input
            id="chat-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Message..."
            maxLength={1000}
            disabled={sending}
            className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:border-coral focus:outline-none focus:ring-coral disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
          <button
            type="submit"
            disabled={sending || !inputText.trim()}
            className="rounded-full bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-coral-dark disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            Envoyer
          </button>
        </form>
      </div>
      <ProfileModal userId={selectedUserId ?? ''} open={!!selectedUserId} onClose={() => setSelectedUserId(null)} />
    </div>
  );
}