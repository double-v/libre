'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface MatchUser {
  id: string;
  displayName: string;
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

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMatches = useCallback(async () => {
    try {
      const res = await fetch('/api/matches');
      if (!res.ok) {
        throw new Error('Failed to fetch matches');
      }
      const data = await res.json();
      setMatches(data.matches);
    } catch {
      setError('Impossible de charger les matches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">Matches</h1>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {!error && matches.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">Pas encore de match.</p>
      )}

      <div className="space-y-4">
        {matches.map((match) => (
          <div
            key={match.id}
            className="rounded-xl border border-gray-200 p-4 shadow-sm dark:border-gray-700"
          >
            <div className="flex items-center gap-3">
              {match.user.profile.photos && match.user.profile.photos.length > 0 ? (
                <img
                  src={match.user.profile.photos[0]}
                  alt={match.user.displayName}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-lg font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                  {match.user.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">
                  {match.user.displayName}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Match le {new Date(match.createdAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>

            {match.conversationId ? (
              <Link
                href={`/chat/${match.conversationId}`}
                className="mt-3 block w-full rounded-full bg-terracotta py-2 text-center text-sm font-medium text-white transition-colors hover:bg-coral-dark dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                Ouvrir le chat
              </Link>
            ) : (
              <p className="mt-3 text-sm text-gray-400 dark:text-gray-500">Chat non disponible</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}