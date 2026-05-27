'use client';

import { useState, useEffect, useCallback } from 'react';
import CrossingCard from '@/components/CrossingCard';

interface Crossing {
  id: string;
  displayName: string;
  isVerified: boolean;
  profile: {
    bio?: string;
    genderIdentity: string;
    orientation: string[];
    relationshipType: string[];
    interests: string[];
    photos: string[];
  };
  distanceM: number;
  happenedAt: string;
}

export default function CrossingsPage() {
  const [crossings, setCrossings] = useState<Crossing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCrossings = useCallback(async () => {
    try {
      const res = await fetch('/api/geoloc/crossings');
      if (!res.ok) {
        throw new Error('Failed to fetch crossings');
      }
      const data = await res.json();
      setCrossings(data.crossings);
    } catch {
      setError('Impossible de charger les croisements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCrossings();
  }, [fetchCrossings]);

  async function handleLike(userId: string) {
    try {
      await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ likedId: userId }),
      });
    } catch {
      // Silently fail — card is still removed from list
    }
    setCrossings((prev) => prev.filter((c) => c.id !== userId));
  }

  function handlePass(userId: string) {
    setCrossings((prev) => prev.filter((c) => c.id !== userId));
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">Croisements</h1>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {!error && crossings.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">
          Aucun croisement pour le moment. Sortez un peu !
        </p>
      )}

      <div className="space-y-4">
        {crossings.map((crossing) => (
          <CrossingCard
            key={crossing.id}
            displayName={crossing.displayName}
            isVerified={crossing.isVerified}
            distanceM={crossing.distanceM}
            happenedAt={crossing.happenedAt}
            bio={crossing.profile.bio}
            onLike={() => handleLike(crossing.id)}
            onPass={() => handlePass(crossing.id)}
          />
        ))}
      </div>
    </div>
  );
}