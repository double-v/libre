'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Pusher from 'pusher-js';
import OnlineIndicator from '@/components/OnlineIndicator';
import ProfileModal from '@/components/ProfileModal';
import { formatLastSeen, isOnline } from '@/lib/time';
import { photoUrl } from '@/lib/photos';

interface MatchUser {
  id: string;
  displayName: string;
  isVerified: boolean;
  lastActive: string;
  profile: {
    bio?: string;
    photos: string[];
    genderIdentity: string;
    orientation: string[];
    interests: string[];
  };
}

interface Match {
  id: string;
  createdAt: string;
  user: MatchUser;
  conversationId: string | null;
}

function Avatar({ user, size }: { user: MatchUser; size: number }) {
  const photos = user.profile?.photos;
  if (photos && photos.length > 0) {
    return (
      <Image
        src={photoUrl(photos[0])}
        alt={user.displayName}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
        unoptimized
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-full bg-sand font-medium text-coral-dark dark:text-coral-light"
      style={{ width: size, height: size }}
    >
      {user.displayName.charAt(0).toUpperCase()}
    </div>
  );
}

/**
 * Messages — fusion de « Matches » et « Chat ».
 * En haut : les nouveaux matches (sans conversation encore) sous forme de
 * pastilles. En dessous : les conversations ouvertes.
 */
export default function MessagesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    try {
      const res = await fetch('/api/matches');
      if (res.status === 401) {
        setError('Votre session a expiré. Reconnectez-vous pour voir vos messages.');
        return;
      }
      if (!res.ok) {
        throw new Error(`Failed to fetch matches (${res.status})`);
      }
      const data = await res.json();
      setMatches(data.matches);
    } catch (err) {
      console.error('[messages] fetch error:', err);
      setError('Impossible de charger vos messages. Réessayez dans quelques instants.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // IIFE async → pas de setState synchrone dans le corps de l'effet
    // (react-hooks/set-state-in-effect, cf. #179/#193).
    void (async () => {
      await fetchMatches();
    })();
  }, [fetchMatches]);

  // Auto-refresh on new match via Pusher
  useEffect(() => {
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    if (!pusherKey) return;

    let client: Pusher | null = null;

    fetch('/api/auth/session').then((r) => r.json()).then((session) => {
      if (!session?.user?.id) return;
      client = new Pusher(pusherKey, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
        channelAuthorization: { endpoint: '/api/pusher/auth', transport: 'ajax' },
      });
      const channel = client.subscribe(`private-user-${session.user.id}`);
      channel.bind('new-match', () => {
        fetchMatches();
      });
    });

    return () => {
      if (client) client.disconnect();
    };
  }, [fetchMatches]);

  const newMatches = matches.filter((m) => !m.conversationId);
  const conversations = matches.filter((m) => m.conversationId);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-content">Messages</h1>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <p>{error}</p>
          {error.includes('session a expiré') && (
            <div className="mt-2 space-y-2">
              <a
                href="/login"
                className="inline-block rounded bg-red-700 px-3 py-1 text-xs font-medium text-white hover:bg-red-800"
              >
                Se reconnecter
              </a>
              <p className="text-xs text-red-600 dark:text-red-400">
                Toujours bloqué ? Désactivez les extensions type Privacy Badger / uBlock / multi-comptes
                sur getlibre.fr, ou testez en navigation privée. Plus d&apos;infos :{' '}
                <a href="/faq/session-expiree" className="underline">FAQ session expirée</a>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Nouveaux matches — pas encore de conversation */}
      {newMatches.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
            Nouveaux matches
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-1">
            {newMatches.map((match) => (
              <button
                key={match.id}
                type="button"
                onClick={() => setSelectedUserId(match.user.id)}
                className="flex w-16 shrink-0 flex-col items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral rounded-lg"
              >
                <div className="relative">
                  <Avatar user={match.user} size={56} />
                  <OnlineIndicator online={isOnline(new Date(match.user.lastActive))} />
                </div>
                <span className="w-full truncate text-center text-xs text-muted">
                  {match.user.displayName}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Conversations ouvertes */}
      <section>
        {conversations.length > 0 && (
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
            Conversations
          </h2>
        )}

        {!error && matches.length === 0 ? (
          <p className="text-muted">
            Pas encore de match. Continue à explorer dans Découvrir !
          </p>
        ) : conversations.length === 0 && newMatches.length > 0 ? (
          <p className="text-sm text-muted">
            Aucune conversation encore. Ouvre un match ci-dessus pour lancer la discussion.
          </p>
        ) : (
          <div className="space-y-1">
            {conversations.map((match) => (
              <Link
                key={match.id}
                href={`/chat/${match.conversationId}`}
                className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-sunken"
              >
                <div className="relative shrink-0">
                  <Avatar user={match.user} size={48} />
                  <OnlineIndicator online={isOnline(new Date(match.user.lastActive))} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-content">
                    {match.user.displayName}
                  </p>
                  <p className="truncate text-sm text-muted">
                    {formatLastSeen(new Date(match.user.lastActive))}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <ProfileModal userId={selectedUserId ?? ''} open={!!selectedUserId} onClose={() => setSelectedUserId(null)} />
    </div>
  );
}
