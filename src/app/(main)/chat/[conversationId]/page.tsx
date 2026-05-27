'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Pusher from 'pusher-js';
import { encryptMessage } from '@/lib/crypto';
import { useEncryptedChat } from '@/hooks/useEncryptedChat';
import ShareContactButton from '@/components/ShareContactButton';

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

  // E2E encryption state
  const { hasKeys, decryptPrivateKeyFromStorage } = useEncryptedChat();
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversation, messages, and other user's public key
  const loadConversation = useCallback(async () => {
    try {
      // Fetch conversation details
      const convoRes = await fetch(`/api/chat/${conversationId}`);
      if (!convoRes.ok) throw new Error('Failed to fetch conversation');
      const convoData: ConversationData = await convoRes.json();

      setOtherUser(convoData.otherUser);

      // Fetch other user's profile to get their public key
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

  // Subscribe to Pusher for real-time messages
  useEffect(() => {
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    if (!pusherKey) return;

    const pusher = new Pusher(pusherKey, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
    });

    const channelName = `private-chat-${conversationId}`;
    const channel = pusher.subscribe(channelName);

    channel.bind('new-message', (data: { id: string; senderId: string; createdAt: string }) => {
      // Pusher only sends metadata; fetch the full message
      fetch(`/api/chat/${conversationId}/messages`)
        .then((res) => res.json())
        .then((msgData) => {
          if (msgData.messages) {
            setMessages(msgData.messages);
          }
        })
        .catch(() => {
          // Fallback: add partial message from Pusher data
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.id)) return prev;
            return [
              ...prev,
              {
                id: data.id,
                senderId: data.senderId,
                content: '[Message chiffre]',
                createdAt: data.createdAt,
              },
            ];
          });
        });
    });

    return () => {
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [conversationId]);

  // Handle password unlock for E2E encryption
  const handleUnlockKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    try {
      const key = await decryptPrivateKeyFromStorage(password);
      setPrivateKey(key);
      setShowPasswordPrompt(false);
      setPassword('');
    } catch {
      setPasswordError('Mot de passe incorrect ou cle introuvable');
    }
  };

  // Prompt for password when user tries to send but hasn't unlocked their key
  const ensurePrivateKey = (): string | null => {
    if (privateKey) return privateKey;
    if (hasKeys) {
      setShowPasswordPrompt(true);
    }
    return null;
  };

  // Send a message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      let content = text;

      // Encrypt if we have the other user's public key and our private key
      const myPrivateKey = ensurePrivateKey();
      if (otherPublicKey && myPrivateKey) {
        content = await encryptMessage(text, otherPublicKey, myPrivateKey);
      }

      const res = await fetch(`/api/chat/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) throw new Error('Failed to send message');

      // The new message will come through Pusher, but we can optimistically add it
      const msgData = await res.json();
      if (msgData.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msgData.message.id)) return prev;
          return [...prev, msgData.message];
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

  // Format time for message display
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] max-w-lg flex-col mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 p-4 dark:border-gray-800">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-300 text-sm font-bold dark:bg-gray-600">
          {otherUser?.displayName?.[0] ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="truncate text-lg font-bold">{otherUser?.displayName ?? 'Utilisateur'}</h1>
          {otherUser && (
            <ShareContactButton conversationId={conversationId} onSend={handleShareContact} />
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-2 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Password prompt modal */}
      {showPasswordPrompt && (
        <div className="mx-4 mt-2 rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-950/50">
          <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
            Debloquez votre cle privee pour envoyer des messages chiffres
          </p>
          <form onSubmit={handleUnlockKey} className="space-y-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
            {passwordError && (
              <p className="text-xs text-red-600 dark:text-red-400">{passwordError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Debloquer
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordPrompt(false);
                  setPassword('');
                  setPasswordError('');
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* E2E status indicator */}
      {!privateKey && hasKeys && !showPasswordPrompt && (
        <div className="mx-4 mt-2 rounded-md bg-yellow-50 p-2 text-xs text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
          Vos messages seront envoyes en clair jusqu&apos;au deblocage de votre cle privee.
          <button
            onClick={() => setShowPasswordPrompt(true)}
            className="ml-1 font-medium underline"
          >
            Debloquer
          </button>
        </div>
      )}

      {!hasKeys && (
        <div className="mx-4 mt-2 rounded-md bg-yellow-50 p-2 text-xs text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
          Le chiffrement E2E n&apos;est pas active. Configurez vos cles dans votre profil.
        </div>
      )}

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400">
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
                    ? 'bg-black text-white dark:bg-gray-100 dark:text-gray-900'
                    : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                }`}
              >
                <p className="text-sm break-words">{msg.content}</p>
                <p
                  className={`mt-1 text-[10px] ${
                    isSent
                      ? 'text-gray-400 dark:text-gray-500'
                      : 'text-gray-500 dark:text-gray-400'
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
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Message..."
            maxLength={1000}
            disabled={sending}
            className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
          <button
            type="submit"
            disabled={sending || !inputText.trim()}
            className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            Envoyer
          </button>
        </form>
      </div>
    </div>
  );
}