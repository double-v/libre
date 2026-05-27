'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface MatchUser {
  id: string;
  displayName: string;
  isVerified?: boolean;
  profile?: {
    photos?: string[];
  };
}

interface Match {
  id: string;
  createdAt: string;
  user: MatchUser;
  conversationId: string | null;
}

export default function ChatListPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchMatches() {
      try {
        const res = await fetch('/api/matches');
        if (!res.ok) throw new Error('Failed to fetch matches');
        const data = await res.json();
        setMatches(data.matches);
      } catch {
        setError('Impossible de charger les matchs');
      } finally {
        setLoading(false);
      }
    }
    fetchMatches();
  }, []);

  // Only show matches that have a conversation
  const chatMatches = matches.filter((m) => m.conversationId);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Messages</h1>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {chatMatches.length === 0 ? (
        <p className="text-gray-500">Pas encore de match. Continuez à explorer !</p>
      ) : (
        <div className="space-y-2">
          {chatMatches.map((match) => (
            <Link
              key={match.id}
              href={`/chat/${match.conversationId}`}
              className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-300 text-sm font-bold dark:bg-gray-600">
                {match.user.displayName[0]}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{match.user.displayName}</p>
                {match.user.isVerified && (
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">
                    Verifie
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}