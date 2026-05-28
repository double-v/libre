'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Pusher from 'pusher-js';

interface MatchEvent {
  matchId: string;
  conversationId?: string;
  matchedWith: {
    id: string;
    displayName: string;
    photos?: string[];
  };
}

interface MatchDialogProps {
  userId: string;
  pusherKey: string;
  pusherCluster: string;
}

export default function MatchDialog({ userId, pusherKey, pusherCluster }: MatchDialogProps) {
  const [match, setMatch] = useState<MatchEvent | null>(null);
  const seenIds = useRef<Set<string>>(new Set());

  const handleMatch = (data: MatchEvent) => {
    if (seenIds.current.has(data.matchId)) return;
    seenIds.current.add(data.matchId);
    setMatch(data);
  };

  useEffect(() => {
    // Listen for instant matches from the like action (current user is the liker)
    const handleInstantMatch = (e: Event) => {
      handleMatch((e as CustomEvent).detail as MatchEvent);
    };
    window.addEventListener('libre:instant-match', handleInstantMatch);

    // Listen for Pusher real-time matches (other user liked us back)
    let client: Pusher | null = null;
    if (pusherKey) {
      client = new Pusher(pusherKey, {
        cluster: pusherCluster,
        channelAuthorization: { endpoint: '/api/pusher/auth', transport: 'ajax' },
      });
      const channel = client.subscribe(`private-user-${userId}`);
      channel.bind('new-match', (data: MatchEvent) => {
        handleMatch(data);
      });
    }

    return () => {
      window.removeEventListener('libre:instant-match', handleInstantMatch);
      if (client) {
        client.unsubscribe(`private-user-${userId}`);
        client.disconnect();
      }
    };
  }, [userId, pusherKey, pusherCluster]);

  if (!match) return null;

  const photo = match.matchedWith.photos?.[0];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl dark:bg-gray-900">
        <div className="mb-2 text-3xl">🔥</div>
        <h2 className="mb-1 text-xl font-bold text-gray-900 dark:text-gray-100">
          C&apos;est un match !
        </h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Vous et {match.matchedWith.displayName} vous plaisez mutuellement
        </p>

        {photo ? (
          <img
            src={photo}
            alt={match.matchedWith.displayName}
            className="mx-auto mb-4 h-24 w-24 rounded-full object-cover"
          />
        ) : (
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-blush text-3xl font-bold text-coral">
            {match.matchedWith.displayName.charAt(0).toUpperCase()}
          </div>
        )}

        <p className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          {match.matchedWith.displayName}
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setMatch(null)}
            className="flex-1 rounded-full border border-gray-300 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Continuer
          </button>
          {match.conversationId && (
            <Link
              href={`/chat/${match.conversationId}`}
              onClick={() => setMatch(null)}
              className="flex-1 rounded-full bg-terracotta py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-coral-dark"
            >
              Discuter
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}